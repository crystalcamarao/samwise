import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../state";
import { THEME_ORDER, THEMES } from "../config/templates";
import { getLayout } from "../config/layouts";
import { listCameras } from "../lib/camera";
import { getPrinter } from "../lib/printer";
import { buildTestImage, renderReceiptThumbnail } from "../lib/thermal";
import { DEFAULT_SETTINGS, type Settings } from "../lib/settings";
import {
  fetchStatus,
  fetchStorage,
  purgeAll,
  syncNow,
  type CloudStatus,
  type StorageStats,
} from "../lib/admin-api";

const GB = 1024 ** 3;
const fmtGb = (b: number | null) =>
  b == null ? "—" : `${(b / GB).toFixed(2)} GB`;

export function Admin() {
  const { settings, updateSettings, go } = useApp();
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [printMsg, setPrintMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const importRef = useRef<HTMLInputElement>(null);

  // Render B&W receipt previews for each theme (reflects fonts + layout).
  useEffect(() => {
    const vars = { eventName: settings.eventName, date: settings.date };
    const layout = getLayout(4);
    const next: Record<string, string> = {};
    for (const id of THEME_ORDER) {
      try {
        next[id] = renderReceiptThumbnail(layout, THEMES[id], vars);
      } catch {
        /* ignore */
      }
    }
    setThumbs(next);
  }, [settings.eventName, settings.date]);

  const refresh = useCallback(async () => {
    setStatus(await fetchStatus());
    setStorage(await fetchStorage());
  }, []);

  useEffect(() => {
    listCameras().then(setCameras);
    refresh();
  }, [refresh]);

  const testPrint = async () => {
    setBusy(true);
    setPrintMsg("Printing test…");
    try {
      const img = buildTestImage(settings.eventName, settings.thermalContrast);
      await getPrinter().print({
        imageData: img.imageData,
        copies: 1,
        intensity: settings.printIntensity,
      });
      setPrintMsg("Test sent ✓");
    } catch (e) {
      setPrintMsg(`Print failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  };

  const reconnect = async () => {
    setBusy(true);
    setPrintMsg("Connecting…");
    try {
      await getPrinter().connect();
      setPrintMsg("Connected ✓");
    } catch (e) {
      setPrintMsg(`Connect failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  };

  const onLogo = (file: File | undefined) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => updateSettings({ logoDataUrl: r.result as string });
    r.readAsDataURL(file);
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "photobooth-config.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importConfig = (file: File | undefined) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result as string) as Partial<Settings>;
        updateSettings({ ...DEFAULT_SETTINGS, ...parsed });
        setPrintMsg("Config imported ✓");
      } catch {
        setPrintMsg("Invalid config file");
      }
    };
    r.readAsText(file);
  };

  const doSync = async () => {
    setBusy(true);
    await syncNow();
    await refresh();
    setBusy(false);
  };

  const doPurge = async () => {
    if (!window.confirm("Delete ALL sessions (local and cloud)? Cannot undo."))
      return;
    setBusy(true);
    await purgeAll();
    await refresh();
    setBusy(false);
  };

  const overWarn =
    storage && storage.usedBytes / GB > settings.storageWarnGb;

  return (
    <div className="screen admin">
      <header className="admin-head">
        <h1>Admin</h1>
        <button className="btn" onClick={() => go("attract")}>
          Close
        </button>
      </header>

      <div className="admin-grid">
        <section className="admin-card">
          <h2>Event</h2>
          <label>
            Event name
            <input
              value={settings.eventName}
              onChange={(e) => updateSettings({ eventName: e.target.value })}
            />
          </label>
          <label>
            Date
            <input
              value={settings.date}
              onChange={(e) => updateSettings({ date: e.target.value })}
            />
          </label>
          <label>
            Admin PIN
            <input
              value={settings.pin}
              onChange={(e) => updateSettings({ pin: e.target.value })}
            />
          </label>
          <div className="field-label">Receipt theme (preview = what prints)</div>
          <div className="theme-grid">
            {THEME_ORDER.map((id) => (
              <button
                key={id}
                className={`theme-opt ${settings.themeId === id ? "on" : ""}`}
                onClick={() => updateSettings({ themeId: id })}
              >
                {thumbs[id] ? (
                  <img className="theme-thumb" src={thumbs[id]} alt="" />
                ) : (
                  <span className="theme-thumb empty" />
                )}
                <span className="theme-name">{THEMES[id].name}</span>
              </button>
            ))}
          </div>
          <label className="file-label">
            Logo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onLogo(e.target.files?.[0])}
            />
          </label>
          {settings.logoDataUrl && (
            <button
              className="btn small"
              onClick={() => updateSettings({ logoDataUrl: null })}
            >
              Remove logo
            </button>
          )}
        </section>

        <section className="admin-card">
          <h2>Camera</h2>
          <label>
            Device
            <select
              value={settings.cameraId ?? ""}
              onChange={(e) =>
                updateSettings({ cameraId: e.target.value || null })
              }
            >
              <option value="">Default (front)</option>
              {cameras.map((c) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Camera ${c.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="admin-card">
          <h2>Printer</h2>
          <label>
            Intensity ({settings.printIntensity})
            <input
              type="range"
              min={0}
              max={255}
              value={settings.printIntensity}
              onChange={(e) =>
                updateSettings({ printIntensity: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Contrast ({settings.thermalContrast.toFixed(2)})
            <input
              type="range"
              min={0.8}
              max={1.6}
              step={0.05}
              value={settings.thermalContrast}
              onChange={(e) =>
                updateSettings({ thermalContrast: Number(e.target.value) })
              }
            />
          </label>
          <div className="row">
            <button className="btn small" disabled={busy} onClick={reconnect}>
              Reconnect
            </button>
            <button className="btn small" disabled={busy} onClick={testPrint}>
              Test print
            </button>
          </div>
          {printMsg && <p className="muted-msg">{printMsg}</p>}
        </section>

        <section className="admin-card">
          <h2>Cloud sync</h2>
          {status ? (
            <ul className="kv">
              <li>
                Cloud: {status.cloudConfigured ? "configured" : "off (LAN only)"}
              </li>
              <li>Online: {status.online ? "yes" : "no"}</li>
              <li>Pending upload: {status.pending}</li>
            </ul>
          ) : (
            <p className="muted-msg">Server unreachable</p>
          )}
          <button className="btn small" disabled={busy} onClick={doSync}>
            Sync now
          </button>
        </section>

        <section className="admin-card">
          <h2>Storage</h2>
          {storage ? (
            <ul className="kv">
              <li>Sessions: {storage.sessions}</li>
              <li>Used: {fmtGb(storage.usedBytes)}</li>
              <li>Free: {fmtGb(storage.freeBytes)}</li>
            </ul>
          ) : (
            <p className="muted-msg">Server unreachable</p>
          )}
          <label>
            Warn over (GB)
            <input
              type="number"
              min={1}
              value={settings.storageWarnGb}
              onChange={(e) =>
                updateSettings({ storageWarnGb: Number(e.target.value) })
              }
            />
          </label>
          {overWarn && (
            <p className="warn">
              ⚠ Storage over {settings.storageWarnGb} GB — consider purging.
            </p>
          )}
          <button className="btn small danger" disabled={busy} onClick={doPurge}>
            Delete all sessions
          </button>
        </section>

        <section className="admin-card">
          <h2>Config</h2>
          <div className="row">
            <button className="btn small" onClick={exportConfig}>
              Export
            </button>
            <button
              className="btn small"
              onClick={() => importRef.current?.click()}
            >
              Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => importConfig(e.target.files?.[0])}
            />
          </div>
          <p className="muted-msg">
            Export to clone this setup to another tablet.
          </p>
        </section>
      </div>
    </div>
  );
}

/** Thin client for the tablet server's admin endpoints (all best-effort). */

export interface CloudStatus {
  cloudConfigured: boolean;
  online: boolean;
  pending: number;
}

export interface StorageStats {
  sessions: number;
  usedBytes: number;
  freeBytes: number | null;
  totalBytes: number | null;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function postJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { method: "POST" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const fetchStatus = () => getJson<CloudStatus>("/api/status");
export const fetchStorage = () => getJson<StorageStats>("/api/storage");
export const syncNow = () =>
  postJson<{ synced: number; pending: number }>("/api/sync");
export const purgeAll = () => postJson<{ deleted: number }>("/api/purge");

/**
 * Printer abstraction. The real implementation drives an MXW01 over Web
 * Bluetooth via `mxw01-thermal-printer`; a mock simulates timing so the flow
 * works in dev and on devices without Bluetooth.
 *
 * The thermal image we hand in is already 1-bit (Atkinson-dithered in
 * `thermal.ts`), so we ask the library for `threshold` dithering — a no-op on a
 * pure black/white image — which keeps the print matching the on-screen preview.
 */

export type PrinterState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "printing"
  | "error";

/** Normalized hardware status for the admin panel (step 10). */
export interface PrinterStatus {
  printing: boolean;
  paperJam: boolean;
  outOfPaper: boolean;
  coverOpen: boolean;
  batteryLow: boolean;
  overheat: boolean;
}

export interface PrintJob {
  imageData: ImageData;
  copies: number;
  intensity?: number; // 0-255
}

export interface Printer {
  getState(): PrinterState;
  connect(): Promise<void>;
  print(job: PrintJob): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<PrinterStatus | null>;
}

const DEFAULT_INTENSITY = 110;

class Mxw01Printer implements Printer {
  // Loaded lazily so the browser-only library and the device picker are only
  // touched when we actually connect.
  private client: any = null;
  private state: PrinterState = "disconnected";

  getState() {
    return this.state;
  }

  private async ensureClient() {
    if (this.client) return this.client;
    const mod = await import("mxw01-thermal-printer");
    const adapter = new mod.WebBluetoothAdapter();
    const client = new mod.ThermalPrinterClient(adapter);
    client.on("disconnected", () => {
      this.state = "disconnected";
    });
    client.on("error", () => {
      this.state = "error";
    });
    this.client = client;
    return client;
  }

  async connect() {
    const client = await this.ensureClient();
    this.state = "connecting";
    try {
      await client.connect(); // triggers the browser device picker
      this.state = "connected";
    } catch (e) {
      this.state = "error";
      throw e;
    }
  }

  async print(job: PrintJob) {
    if (this.state !== "connected") await this.connect();
    const client = await this.ensureClient();
    this.state = "printing";
    try {
      const intensity = job.intensity ?? DEFAULT_INTENSITY;
      for (let i = 0; i < job.copies; i++) {
        await client.print(job.imageData, { dither: "threshold", intensity });
      }
      this.state = "connected";
    } catch (e) {
      this.state = "error";
      throw e;
    }
  }

  async getStatus(): Promise<PrinterStatus | null> {
    if (!this.client) return null;
    const s = await this.client.getStatus();
    if (!s) return null;
    return {
      printing: s.printing,
      paperJam: s.paper_jam,
      outOfPaper: s.out_of_paper,
      coverOpen: s.cover_open,
      batteryLow: s.battery_low,
      overheat: s.overheat,
    };
  }

  async disconnect() {
    await this.client?.disconnect();
    this.state = "disconnected";
  }
}

class MockPrinter implements Printer {
  private state: PrinterState = "disconnected";

  getState() {
    return this.state;
  }
  async connect() {
    this.state = "connecting";
    await delay(400);
    this.state = "connected";
  }
  async print(job: PrintJob) {
    if (this.state !== "connected") await this.connect();
    this.state = "printing";
    for (let i = 0; i < job.copies; i++) await delay(1500);
    this.state = "connected";
  }
  async getStatus(): Promise<PrinterStatus | null> {
    return {
      printing: false,
      paperJam: false,
      outOfPaper: false,
      coverOpen: false,
      batteryLow: false,
      overheat: false,
    };
  }
  async disconnect() {
    this.state = "disconnected";
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function webBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

let instance: Printer | null = null;

/**
 * Shared printer instance — keeps one BLE connection alive across prints.
 * Uses the real MXW01 client when Web Bluetooth is present; otherwise (or when
 * `localStorage.pb_printer === "mock"`) falls back to the mock.
 */
export function getPrinter(): Printer {
  if (instance) return instance;
  const forceMock =
    typeof localStorage !== "undefined" &&
    localStorage.getItem("pb_printer") === "mock";
  instance =
    !forceMock && webBluetoothAvailable() ? new Mxw01Printer() : new MockPrinter();
  return instance;
}

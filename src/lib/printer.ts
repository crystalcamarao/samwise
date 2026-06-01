/**
 * Printer abstraction. Step 8 swaps in the real MXW01 Web Bluetooth client
 * (`mxw01-thermal-printer`); until then a mock simulates timing so the print
 * flow, queue, and preview can be built and tested without hardware.
 */

export type PrinterState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "printing"
  | "error";

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
    // ~1.5s per copy, mimicking real thermal throughput.
    for (let i = 0; i < job.copies; i++) await delay(1500);
    this.state = "connected";
  }
  async disconnect() {
    this.state = "disconnected";
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let instance: Printer | null = null;

/** Shared printer instance — keeps one BLE connection alive across prints. */
export function getPrinter(): Printer {
  if (!instance) instance = new MockPrinter();
  return instance;
}

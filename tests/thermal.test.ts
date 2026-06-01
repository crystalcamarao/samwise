import { describe, expect, it } from "vitest";
import { atkinsonDither } from "../src/lib/thermal";

describe("atkinsonDither", () => {
  it("snaps every pixel to pure black or white", () => {
    const w = 16;
    const h = 16;
    const gray = new Float32Array(w * h);
    for (let i = 0; i < gray.length; i++) gray[i] = 128; // mid-grey field
    atkinsonDither(gray, w, h);
    for (const v of gray) expect(v === 0 || v === 255).toBe(true);
  });

  it("keeps a mid-grey field roughly half white (error diffusion)", () => {
    const w = 32;
    const h = 32;
    const gray = new Float32Array(w * h).fill(128);
    atkinsonDither(gray, w, h);
    const white = [...gray].filter((v) => v === 255).length;
    const ratio = white / gray.length;
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(0.8);
  });

  it("leaves an all-white field white and all-black black", () => {
    const white = new Float32Array(64).fill(255);
    atkinsonDither(white, 8, 8);
    expect([...white].every((v) => v === 255)).toBe(true);

    const black = new Float32Array(64).fill(0);
    atkinsonDither(black, 8, 8);
    expect([...black].every((v) => v === 0)).toBe(true);
  });
});

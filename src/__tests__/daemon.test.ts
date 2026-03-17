import { describe, it, expect } from "bun:test";
import { lerp } from "../daemon.ts";
import { oscResetBackground } from "../osc.ts";

describe("lerp", () => {
  it("returns base color at t=0", () => {
    expect(lerp({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 0)).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("returns peak color at t=1", () => {
    expect(lerp({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 1)).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("interpolates midpoint correctly", () => {
    expect(lerp({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 0.5)).toEqual({ r: 128, g: 128, b: 128 });
  });

  it("interpolates at t=0.25 with mixed colors", () => {
    expect(lerp({ r: 0, g: 0, b: 0 }, { r: 100, g: 200, b: 50 }, 0.25)).toEqual({ r: 25, g: 50, b: 13 });
  });

  it("never produces values outside 0-255 for t in [0, 1]", () => {
    const a = { r: 0, g: 0, b: 0 };
    const b = { r: 255, g: 255, b: 255 };
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const result = lerp(a, b, t);
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(255);
      expect(result.g).toBeGreaterThanOrEqual(0);
      expect(result.g).toBeLessThanOrEqual(255);
      expect(result.b).toBeGreaterThanOrEqual(0);
      expect(result.b).toBeLessThanOrEqual(255);
    }
  });
});

describe("oscResetBackground", () => {
  it("returns the expected OSC reset sequence", () => {
    const seq = oscResetBackground();
    // OSC 11 reset: ESC ] 111 BEL  (or ESC \ terminator)
    expect(seq).toContain("\x1b]");
    expect(seq.length).toBeGreaterThan(0);
  });
});

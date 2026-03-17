import { describe, expect, test } from "bun:test";
import { oscSetBackground, oscResetBackground } from "../osc";

describe("oscSetBackground", () => {
  test("generates correct OSC 11 sequence for given RGB", () => {
    expect(oscSetBackground(61, 43, 26)).toBe("\x1b]11;rgb:3d/2b/1a\x07");
  });

  test("handles black (0,0,0)", () => {
    expect(oscSetBackground(0, 0, 0)).toBe("\x1b]11;rgb:00/00/00\x07");
  });

  test("handles white (255,255,255)", () => {
    expect(oscSetBackground(255, 255, 255)).toBe("\x1b]11;rgb:ff/ff/ff\x07");
  });
});

describe("oscResetBackground", () => {
  test("generates correct OSC 111 reset sequence", () => {
    expect(oscResetBackground()).toBe("\x1b]111\x07");
  });
});

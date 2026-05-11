import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { getConfig, parseHexColor } from "../config";

const ENV_KEYS = [
  "CLAUDE_PULSE_CYCLE_MS",
  "CLAUDE_PULSE_FRAME_MS",
  "CLAUDE_PULSE_BASE_COLOR",
  "CLAUDE_PULSE_PEAK_COLOR",
  "CLAUDE_PULSE_MAX_LIFETIME_MS",
  "CLAUDE_PULSE_DISABLED",
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }
});

describe("getConfig defaults", () => {
  test("returns defaults when no env vars set", () => {
    const config = getConfig();
    expect(config.cycleMs).toBe(3000);
    expect(config.frameMs).toBe(50);
    expect(config.baseColor).toEqual({ r: 26, g: 26, b: 26 });
    expect(config.peakColor).toEqual({ r: 61, g: 43, b: 26 });
    expect(config.maxLifetimeMs).toBe(600000);
    expect(config.disabled).toBe(false);
  });
});

describe("getConfig reads env vars", () => {
  test("reads CLAUDE_PULSE_CYCLE_MS", () => {
    process.env.CLAUDE_PULSE_CYCLE_MS = "5000";
    expect(getConfig().cycleMs).toBe(5000);
  });

  test("reads CLAUDE_PULSE_FRAME_MS", () => {
    process.env.CLAUDE_PULSE_FRAME_MS = "100";
    expect(getConfig().frameMs).toBe(100);
  });

  test("reads CLAUDE_PULSE_BASE_COLOR", () => {
    process.env.CLAUDE_PULSE_BASE_COLOR = "ff0000";
    expect(getConfig().baseColor).toEqual({ r: 255, g: 0, b: 0 });
  });

  test("reads CLAUDE_PULSE_PEAK_COLOR", () => {
    process.env.CLAUDE_PULSE_PEAK_COLOR = "00ff00";
    expect(getConfig().peakColor).toEqual({ r: 0, g: 255, b: 0 });
  });

  test("reads CLAUDE_PULSE_MAX_LIFETIME_MS", () => {
    process.env.CLAUDE_PULSE_MAX_LIFETIME_MS = "1200000";
    expect(getConfig().maxLifetimeMs).toBe(1200000);
  });

  test("CLAUDE_PULSE_DISABLED=1 sets disabled flag", () => {
    process.env.CLAUDE_PULSE_DISABLED = "1";
    expect(getConfig().disabled).toBe(true);
  });

  test("CLAUDE_PULSE_DISABLED=true sets disabled flag", () => {
    process.env.CLAUDE_PULSE_DISABLED = "true";
    expect(getConfig().disabled).toBe(true);
  });
});

describe("getConfig guards CPU-sensitive timing values", () => {
  test("clamps frame interval to a non-spinning minimum", () => {
    process.env.CLAUDE_PULSE_FRAME_MS = "0";
    expect(getConfig().frameMs).toBe(16);
  });

  test("falls back when frame interval is not numeric", () => {
    process.env.CLAUDE_PULSE_FRAME_MS = "nope";
    expect(getConfig().frameMs).toBe(50);
  });

  test("clamps cycle and lifetime intervals to usable minimums", () => {
    process.env.CLAUDE_PULSE_CYCLE_MS = "0";
    process.env.CLAUDE_PULSE_MAX_LIFETIME_MS = "-1";
    const config = getConfig();
    expect(config.cycleMs).toBe(100);
    expect(config.maxLifetimeMs).toBe(1000);
  });
});

describe("parseHexColor", () => {
  test("parses 6-char hex string correctly", () => {
    expect(parseHexColor("3d2b1a")).toEqual({ r: 61, g: 43, b: 26 });
  });

  test("parses black", () => {
    expect(parseHexColor("000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  test("parses white", () => {
    expect(parseHexColor("ffffff")).toEqual({ r: 255, g: 255, b: 255 });
  });
});

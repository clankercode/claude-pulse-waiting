export type RGB = { r: number; g: number; b: number };

export function parseHexColor(hex: string): RGB {
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export type PulseConfig = {
  cycleMs: number;
  frameMs: number;
  baseColor: RGB;
  peakColor: RGB;
  maxLifetimeMs: number;
  disabled: boolean;
};

const DEFAULT_CYCLE_MS = 3000;
const DEFAULT_FRAME_MS = 50;
const DEFAULT_MAX_LIFETIME_MS = 600000;
const MIN_CYCLE_MS = 100;
const MIN_FRAME_MS = 16;
const MIN_MAX_LIFETIME_MS = 1000;

function readMs(value: string | undefined, defaultValue: number, minValue: number): number {
  if (value === undefined) return defaultValue;

  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return defaultValue;

  return Math.max(parsed, minValue);
}

export function getConfig(): PulseConfig {
  const env = process.env;

  const cycleMs = readMs(env.CLAUDE_PULSE_CYCLE_MS, DEFAULT_CYCLE_MS, MIN_CYCLE_MS);
  const frameMs = readMs(env.CLAUDE_PULSE_FRAME_MS, DEFAULT_FRAME_MS, MIN_FRAME_MS);
  const baseColor = parseHexColor(env.CLAUDE_PULSE_BASE_COLOR ?? "1a1a1a");
  const peakColor = parseHexColor(env.CLAUDE_PULSE_PEAK_COLOR ?? "3d2b1a");
  const maxLifetimeMs = readMs(
    env.CLAUDE_PULSE_MAX_LIFETIME_MS,
    DEFAULT_MAX_LIFETIME_MS,
    MIN_MAX_LIFETIME_MS,
  );
  const disabledVal = env.CLAUDE_PULSE_DISABLED;
  const disabled = disabledVal === "1" || disabledVal === "true";

  return { cycleMs, frameMs, baseColor, peakColor, maxLifetimeMs, disabled };
}

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

export function getConfig(): PulseConfig {
  const env = process.env;

  const cycleMs = env.CLAUDE_PULSE_CYCLE_MS ? parseInt(env.CLAUDE_PULSE_CYCLE_MS, 10) : 3000;
  const frameMs = env.CLAUDE_PULSE_FRAME_MS ? parseInt(env.CLAUDE_PULSE_FRAME_MS, 10) : 50;
  const baseColor = parseHexColor(env.CLAUDE_PULSE_BASE_COLOR ?? "1a1a1a");
  const peakColor = parseHexColor(env.CLAUDE_PULSE_PEAK_COLOR ?? "3d2b1a");
  const maxLifetimeMs = env.CLAUDE_PULSE_MAX_LIFETIME_MS
    ? parseInt(env.CLAUDE_PULSE_MAX_LIFETIME_MS, 10)
    : 600000;
  const disabledVal = env.CLAUDE_PULSE_DISABLED;
  const disabled = disabledVal === "1" || disabledVal === "true";

  return { cycleMs, frameMs, baseColor, peakColor, maxLifetimeMs, disabled };
}

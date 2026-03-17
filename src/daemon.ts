import { openSync, writeSync, closeSync } from "node:fs";
import { getConfig } from "./config.ts";
import { oscSetBackground, oscResetBackground } from "./osc.ts";
import { writePid, removePid } from "./pid.ts";
import type { RGB } from "./config.ts";

export function lerp(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

export async function runDaemon(sessionId: string): Promise<void> {
  const config = getConfig();
  if (config.disabled) return;

  let fd: number;
  try {
    fd = openSync("/dev/tty", "w");
  } catch {
    return;
  }

  writePid(sessionId);

  const cleanup = () => {
    writeSync(fd, oscResetBackground());
    closeSync(fd);
    removePid(sessionId);
  };

  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });

  setTimeout(() => {
    cleanup();
    process.exit(0);
  }, config.maxLifetimeMs);

  const start = Date.now();
  while (true) {
    const elapsed = Date.now() - start;
    const t = (Math.sin(2 * Math.PI * elapsed / config.cycleMs - Math.PI / 2) + 1) / 2;
    const color = lerp(config.baseColor, config.peakColor, t);
    writeSync(fd, oscSetBackground(color.r, color.g, color.b));
    await Bun.sleep(config.frameMs);
  }
}

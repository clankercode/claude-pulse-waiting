import { openSync, writeSync, closeSync, appendFileSync, statSync } from "node:fs";
import { getConfig } from "./config.ts";
import { oscSetBackground, oscResetBackground } from "./osc.ts";
import { writePid, removePidIfMatches } from "./pid.ts";
import type { RGB } from "./config.ts";

const DEBUG_LOG = "/tmp/claude-pulse-debug.log";
function debug(msg: string) {
  try { appendFileSync(DEBUG_LOG, `${new Date().toISOString()} daemon: ${msg}\n`); } catch {}
}

export function lerp(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

export async function runDaemon(sessionId: string, ttyPath: string): Promise<void> {
  debug(`starting sessionId=${sessionId} ttyPath=${ttyPath}`);
  const config = getConfig();
  if (config.disabled) { debug("disabled, exiting"); return; }

  let fd: number;
  try {
    fd = openSync(ttyPath, "w");
    debug(`opened ${ttyPath} fd=${fd}`);
  } catch (err) {
    debug(`failed to open ${ttyPath}: ${err}`);
    return;
  }

  writePid(sessionId);
  debug(`wrote pid ${process.pid}`);

  // Send desktop notification
  try {
    Bun.spawn(["notify-send", "--app-name=Claude Code", "--urgency=low",
      "--hint=string:desktop-entry:com.mitchellh.ghostty",
      "Claude Code", "Waiting for your input"], { stdout: "ignore", stderr: "ignore" });
  } catch {}

  // Record initial TTY atime for activity detection
  let lastTtyAtime: number;
  try {
    lastTtyAtime = statSync(ttyPath).atimeMs;
  } catch {
    lastTtyAtime = 0;
  }

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    try { writeSync(fd, oscResetBackground()); } catch {}
    try { closeSync(fd); } catch {}
    removePidIfMatches(sessionId, process.pid);
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

  debug("entering animation loop");
  const start = Date.now();
  let frames = 0;
  while (true) {
    // Check for TTY activity (user typing) every ~500ms
    if (lastTtyAtime > 0 && frames % 10 === 0 && frames > 0) {
      try {
        const currentAtime = statSync(ttyPath).atimeMs;
        if (currentAtime > lastTtyAtime) {
          debug(`TTY activity detected (atime changed), stopping`);
          cleanup();
          process.exit(0);
        }
      } catch {}
    }

    const elapsed = Date.now() - start;
    const t = (Math.sin(2 * Math.PI * elapsed / config.cycleMs - Math.PI / 2) + 1) / 2;
    const color = lerp(config.baseColor, config.peakColor, t);
    try {
      writeSync(fd, oscSetBackground(color.r, color.g, color.b));
    } catch (err) {
      debug(`writeSync failed at frame ${frames}: ${err}`);
      cleanup();
      return;
    }
    frames++;
    if (frames === 1) debug(`first frame written: t=${t.toFixed(3)} color=rgb(${color.r},${color.g},${color.b})`);
    await Bun.sleep(config.frameMs);
  }
}

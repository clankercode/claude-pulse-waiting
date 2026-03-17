import { writeFileSync, readFileSync, unlinkSync } from "node:fs";

export function pidPath(sessionId: string): string {
  return `/tmp/claude-pulse-${sessionId}.pid`;
}

export function writePid(sessionId: string): void {
  writeFileSync(pidPath(sessionId), process.pid.toString());
}

export function readPid(sessionId: string): number | null {
  try {
    const contents = readFileSync(pidPath(sessionId), "utf8");
    const pid = parseInt(contents.trim(), 10);
    if (isNaN(pid)) return null;
    return pid;
  } catch {
    return null;
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function removePid(sessionId: string): void {
  try {
    unlinkSync(pidPath(sessionId));
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
  }
}

import { describe, it, expect, afterEach } from "bun:test";
import { pidPath, writePid, readPid, isProcessAlive, removePid } from "../pid.ts";
import { existsSync } from "node:fs";

const sessionId = "test-" + Date.now();

afterEach(() => {
  removePid(sessionId);
});

describe("pidPath", () => {
  it("returns different paths for different session IDs", () => {
    const path1 = pidPath("session-a");
    const path2 = pidPath("session-b");
    expect(path1).not.toBe(path2);
    expect(path1).toBe("/tmp/claude-pulse-session-a.pid");
    expect(path2).toBe("/tmp/claude-pulse-session-b.pid");
  });
});

describe("writePid / readPid", () => {
  it("writePid then readPid returns process.pid", () => {
    writePid(sessionId);
    const pid = readPid(sessionId);
    expect(pid).toBe(process.pid);
  });

  it("readPid returns null for missing session", () => {
    const missing = readPid("nonexistent-session-" + Date.now());
    expect(missing).toBeNull();
  });
});

describe("isProcessAlive", () => {
  it("returns true for current process", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it("returns false for a PID that is very likely not running", () => {
    expect(isProcessAlive(99999)).toBe(false);
  });
});

describe("removePid", () => {
  it("removes the PID file", () => {
    writePid(sessionId);
    const path = pidPath(sessionId);
    expect(existsSync(path)).toBe(true);
    removePid(sessionId);
    expect(existsSync(path)).toBe(false);
  });

  it("does not throw if PID file does not exist", () => {
    expect(() => removePid("nonexistent-session-" + Date.now())).not.toThrow();
  });
});

import { describe, test, expect, afterEach } from "bun:test";
import { existsSync, unlinkSync } from "fs";

const CLI = import.meta.dir + "/../cli.ts";

function pidPath(sessionId: string): string {
  return `/tmp/claude-pulse-${sessionId}.pid`;
}

function makeSessionId(): string {
  return "test-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

async function runCli(
  args: string[],
  stdinData: string
): Promise<{ exitCode: number }> {
  const proc = Bun.spawn(["bun", "run", CLI, ...args], {
    stdin: new TextEncoder().encode(stdinData),
    stdout: "ignore",
    stderr: "ignore",
  });
  const exitCode = await proc.exited;
  return { exitCode };
}

function cleanup(sessionId: string) {
  const path = pidPath(sessionId);
  if (existsSync(path)) {
    try {
      const pidStr = Bun.file(path).toString();
      const pid = parseInt(pidStr.trim(), 10);
      if (!isNaN(pid)) {
        try { process.kill(pid, "SIGTERM"); } catch {}
      }
    } catch {}
    try { unlinkSync(path); } catch {}
  }
}

const tracked: string[] = [];

afterEach(() => {
  for (const sid of tracked.splice(0)) {
    cleanup(sid);
  }
});

describe("cli start", () => {
  test("exits 0 with valid session_id", async () => {
    const sessionId = makeSessionId();
    tracked.push(sessionId);
    const { exitCode } = await runCli(["start"], JSON.stringify({ session_id: sessionId }));
    expect(exitCode).toBe(0);
  }, 10000);

  test("exits 0 with missing session_id", async () => {
    const { exitCode } = await runCli(["start"], JSON.stringify({}));
    expect(exitCode).toBe(0);
  }, 10000);

  test("is idempotent — second start exits 0", async () => {
    const sessionId = makeSessionId();
    tracked.push(sessionId);
    const payload = JSON.stringify({ session_id: sessionId });

    const { exitCode: first } = await runCli(["start"], payload);
    expect(first).toBe(0);

    // Brief pause to allow daemon to potentially write PID
    await Bun.sleep(300);

    const { exitCode: second } = await runCli(["start"], payload);
    expect(second).toBe(0);
  }, 10000);
});

describe("cli stop", () => {
  test("exits 0 with valid session_id when no daemon running", async () => {
    const sessionId = makeSessionId();
    tracked.push(sessionId);
    const { exitCode } = await runCli(["stop"], JSON.stringify({ session_id: sessionId }));
    expect(exitCode).toBe(0);
  }, 10000);

  test("exits 0 with missing session_id", async () => {
    const { exitCode } = await runCli(["stop"], JSON.stringify({}));
    expect(exitCode).toBe(0);
  }, 10000);

  test("stop after start removes PID file if one was created", async () => {
    const sessionId = makeSessionId();
    tracked.push(sessionId);
    const payload = JSON.stringify({ session_id: sessionId });

    await runCli(["start"], payload);
    // Give daemon a moment to possibly write PID
    await Bun.sleep(300);

    await runCli(["stop"], payload);
    // After stop, PID file should not exist
    expect(existsSync(pidPath(sessionId))).toBe(false);
  }, 10000);
});

describe("cli daemon", () => {
  test("exits non-zero without sessionId arg", async () => {
    const proc = Bun.spawn(["bun", "run", CLI, "daemon"], {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });
    const exitCode = await proc.exited;
    expect(exitCode).not.toBe(0);
  }, 10000);
});

describe("cli unknown command", () => {
  test("exits non-zero for unknown command", async () => {
    const proc = Bun.spawn(["bun", "run", CLI, "unknown"], {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });
    const exitCode = await proc.exited;
    expect(exitCode).not.toBe(0);
  }, 10000);
});

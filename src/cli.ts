import { readPid, writePid, isProcessAlive, removePid, removePidIfMatches } from "./pid.ts";
import { runDaemon } from "./daemon.ts";
import { appendFileSync, existsSync, readFileSync, readlinkSync } from "node:fs";
import { join } from "node:path";

const DEBUG_LOG = "/tmp/claude-pulse-debug.log";
function debug(msg: string) {
  try { appendFileSync(DEBUG_LOG, `${new Date().toISOString()} ${msg}\n`); } catch {}
}

function findTtyPath(): string | null {
  // Walk up process tree to find a terminal device fd
  let pid = process.ppid;
  for (let i = 0; i < 10; i++) {
    for (const fdNum of [0, 1, 2]) {
      try {
        const link = readlinkSync(`/proc/${pid}/fd/${fdNum}`);
        if (link.startsWith("/dev/pts/") || link.startsWith("/dev/tty")) {
          return link;
        }
      } catch {}
    }
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
      const ppid = parseInt(stat.split(" ")[3]!);
      if (ppid <= 1) break;
      pid = ppid;
    } catch { break; }
  }
  return null;
}

function isScriptEntrypoint(path: string | undefined): path is string {
  return path !== undefined && /\.(?:[cm]?[tj]s)$/.test(path);
}

function daemonCommand(sessionId: string, ttyPath: string): string[] {
  const compiledBinary = join(import.meta.dir, "../bin/claude-pulse");
  if (existsSync(compiledBinary)) {
    return [compiledBinary, "daemon", sessionId, ttyPath];
  }

  if (isScriptEntrypoint(process.argv[1])) {
    return [process.execPath, "run", process.argv[1], "daemon", sessionId, ttyPath];
  }

  return [process.argv[0] ?? process.execPath, "daemon", sessionId, ttyPath];
}

const command = process.argv[2];
debug(`cli invoked: command=${command} argv=${JSON.stringify(process.argv)}`);

if (command === "start") {
  const input = await Bun.stdin.text();
  debug(`start: stdin=${input.slice(0, 500)}`);
  const hookData = JSON.parse(input);
  const sessionId = hookData.session_id;
  debug(`start: sessionId=${sessionId}`);

  if (!sessionId) { debug("start: no sessionId, exiting"); process.exit(0); }

  const existingPid = readPid(sessionId);
  if (existingPid !== null && isProcessAlive(existingPid)) {
    debug("start: daemon already running");
    process.exit(0);
  }

  const ttyPath = findTtyPath();
  debug(`start: ttyPath=${ttyPath}`);
  if (!ttyPath) { debug("start: no tty found, exiting"); process.exit(0); }

  const proc = Bun.spawn(daemonCommand(sessionId, ttyPath), {
    detached: true,
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
  });
  debug(`start: spawned daemon pid=${proc.pid}`);
  writePid(sessionId, proc.pid);
  proc.unref();
  process.exit(0);

} else if (command === "stop") {
  const input = await Bun.stdin.text();
  debug(`stop: stdin=${input.slice(0, 500)}`);
  const hookData = JSON.parse(input);
  const sessionId = hookData.session_id;
  debug(`stop: sessionId=${sessionId}`);

  if (!sessionId) process.exit(0);

  const pid = readPid(sessionId);
  if (pid === null) {
    removePid(sessionId);
  } else if (isProcessAlive(pid)) {
    process.kill(pid, "SIGTERM");
  } else {
    removePidIfMatches(sessionId, pid);
  }
  process.exit(0);

} else if (command === "daemon") {
  const sessionId = process.argv[3];
  const ttyPath = process.argv[4];
  if (!sessionId || !ttyPath) process.exit(1);
  await runDaemon(sessionId, ttyPath);

} else {
  console.error("Usage: cli.ts <start|stop|daemon> [sessionId]");
  process.exit(1);
}

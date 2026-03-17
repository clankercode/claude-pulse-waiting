import { readPid, writePid, isProcessAlive, removePid } from "./pid.ts";
import { runDaemon } from "./daemon.ts";

const command = process.argv[2];

if (command === "start") {
  const input = await Bun.stdin.text();
  const hookData = JSON.parse(input);
  const sessionId = hookData.session_id;

  if (!sessionId) process.exit(0);

  const existingPid = readPid(sessionId);
  if (existingPid !== null && isProcessAlive(existingPid)) {
    process.exit(0);
  }

  const proc = Bun.spawn(
    ["bun", "run", import.meta.dir + "/cli.ts", "daemon", sessionId],
    { detached: true, stdin: "ignore", stdout: "ignore", stderr: "ignore" }
  );
  proc.unref();
  process.exit(0);

} else if (command === "stop") {
  const input = await Bun.stdin.text();
  const hookData = JSON.parse(input);
  const sessionId = hookData.session_id;

  if (!sessionId) process.exit(0);

  const pid = readPid(sessionId);
  if (pid !== null && isProcessAlive(pid)) {
    process.kill(pid, "SIGTERM");
  }
  removePid(sessionId);
  process.exit(0);

} else if (command === "daemon") {
  const sessionId = process.argv[3];
  if (!sessionId) process.exit(1);
  await runDaemon(sessionId);

} else {
  console.error("Usage: cli.ts <start|stop|daemon> [sessionId]");
  process.exit(1);
}

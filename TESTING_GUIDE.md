# Testing Guide

## Automated tests

```bash
bun test
```

Runs 36 tests across 5 files covering OSC sequences, config parsing, PID management, color interpolation, and CLI integration.

To run individual test files:
```bash
bun test src/__tests__/osc.test.ts
bun test src/__tests__/config.test.ts
bun test src/__tests__/pid.test.ts
bun test src/__tests__/daemon.test.ts
bun test src/__tests__/cli.test.ts
```

## Manual testing

### 1. Visual pulse test

Start the daemon directly to see the breathing animation:

```bash
bun run src/cli.ts daemon test-session
```

Your terminal background should pulse with a warm amber glow on a 3-second cycle. Press `Ctrl+C` to stop — the background resets to default.

If nothing visible happens, your terminal may not support OSC 11. Try a different terminal (Tilix, Wezterm, GNOME Terminal, Kitty).

### 2. Custom colors

Try different color configurations:

```bash
# Blue glow
CLAUDE_PULSE_PEAK_COLOR=1a2a4d bun run src/cli.ts daemon test-session

# Red glow
CLAUDE_PULSE_PEAK_COLOR=4d1a1a bun run src/cli.ts daemon test-session

# Faster breathing
CLAUDE_PULSE_CYCLE_MS=1000 bun run src/cli.ts daemon test-session

# Brighter peak
CLAUDE_PULSE_PEAK_COLOR=6b4a2a bun run src/cli.ts daemon test-session
```

### 3. Start/stop lifecycle

Simulate the hook-driven lifecycle:

```bash
# Terminal 1: Start the daemon (simulating Notification hook)
echo '{"session_id":"manual-test"}' | bun run src/cli.ts start

# Verify daemon is running
cat /tmp/claude-pulse-manual-test.pid
# Should print a PID number

# Your terminal should be pulsing now

# Stop the daemon (simulating UserPromptSubmit hook)
echo '{"session_id":"manual-test"}' | bun run src/cli.ts stop

# Background should reset, PID file should be gone
cat /tmp/claude-pulse-manual-test.pid
# Should fail — file removed
```

### 4. Idempotent start

Verify that multiple start calls don't spawn duplicate daemons:

```bash
echo '{"session_id":"idem-test"}' | bun run src/cli.ts start
PID1=$(cat /tmp/claude-pulse-idem-test.pid 2>/dev/null)

echo '{"session_id":"idem-test"}' | bun run src/cli.ts start
PID2=$(cat /tmp/claude-pulse-idem-test.pid 2>/dev/null)

echo "PID1=$PID1 PID2=$PID2"
# Should be the same PID

# Cleanup
echo '{"session_id":"idem-test"}' | bun run src/cli.ts stop
```

### 5. Kill switch

Verify the disable flag works:

```bash
CLAUDE_PULSE_DISABLED=1 bun run src/cli.ts daemon test-disabled
# Should exit immediately with no pulse
```

### 6. Safety timeout

Verify orphan protection (use a short timeout for testing):

```bash
CLAUDE_PULSE_MAX_LIFETIME_MS=5000 bun run src/cli.ts daemon test-timeout
# Daemon should self-terminate after 5 seconds and reset background
```

### 7. End-to-end with Claude Code

The real integration test:

```bash
claude --plugin-dir /path/to/claude-pulse-waiting
```

Then:
1. Wait for Claude to finish responding — terminal should start pulsing
2. Type a message — pulsing should stop immediately
3. When a permission prompt appears — terminal should pulse
4. Approve/deny the permission — pulsing should stop

### 8. Multiple sessions

Open two terminals, run Claude Code in each with the plugin. Each session should pulse independently based on its own `session_id`.

## Troubleshooting

**No visible pulse**: Your terminal may not support OSC 11. Test directly:
```bash
printf '\033]11;rgb:ff/00/00\007'  # Should turn background red
printf '\033]111\007'               # Should reset
```

**Pulse doesn't stop**: Check for orphan daemons:
```bash
ls /tmp/claude-pulse-*.pid
# Kill any listed PIDs manually, then remove the files
```

**tmux/screen**: Add to your tmux config:
```
set -g allow-passthrough on
```

# claude-pulse-waiting

Claude Code plugin that pulses the terminal background color when Claude is waiting for user input. Creates a subtle warm amber breathing effect so you never miss when your attention is needed.

Works with Tilix, Wezterm, GNOME Terminal, and other VTE/libvte-based terminals that support OSC 11.

## How it works

```
Notification hook fires  -->  CLI "start"  -->  Fork daemon  -->  Pulse /dev/tty via OSC 11
UserPromptSubmit fires   -->  CLI "stop"   -->  SIGTERM daemon  -->  Reset background (OSC 111)
SessionEnd fires         -->  CLI "stop"   -->  (safety cleanup)
```

When Claude Code shows a prompt (idle, permission, or MCP elicitation), the Notification hook spawns a background daemon that writes OSC 11 escape sequences directly to `/dev/tty`, creating a sine-wave breathing animation on the terminal background. When the user responds, the daemon is killed and the background resets to default.

## Requirements

- [Bun](https://bun.sh/) runtime
- A terminal that supports OSC 11 (Tilix, Wezterm, GNOME Terminal, Kitty, Foot, xterm, etc.)

## Installation

```bash
# Clone and install
git clone <repo-url> claude-pulse-waiting
cd claude-pulse-waiting
bun install

# Run with Claude Code
claude --plugin-dir /path/to/claude-pulse-waiting
```

## Configuration

All settings are via environment variables with sensible defaults:

| Variable | Default | Description |
|---|---|---|
| `CLAUDE_PULSE_CYCLE_MS` | `3000` | Full breathing cycle period (ms) |
| `CLAUDE_PULSE_FRAME_MS` | `50` | Frame interval / 20fps (ms) |
| `CLAUDE_PULSE_BASE_COLOR` | `1a1a1a` | Hex color at trough (near black) |
| `CLAUDE_PULSE_PEAK_COLOR` | `3d2b1a` | Hex color at peak (warm amber) |
| `CLAUDE_PULSE_MAX_LIFETIME_MS` | `600000` | Safety timeout — 10 min (ms) |
| `CLAUDE_PULSE_DISABLED` | _(unset)_ | Set to `1` or `true` to disable |

Example — faster pulse with a blue glow:
```bash
export CLAUDE_PULSE_CYCLE_MS=1500
export CLAUDE_PULSE_PEAK_COLOR=1a2a3d
```

## Project structure

```
claude-pulse-waiting/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── hooks/
│   └── hooks.json            # Hook definitions
├── src/
│   ├── cli.ts                # Entry point: start/stop/daemon
│   ├── daemon.ts             # Sine-wave animation loop
│   ├── osc.ts                # OSC escape sequence helpers
│   ├── pid.ts                # PID file management
│   ├── config.ts             # Env-var configuration
│   └── __tests__/            # Test suite
├── package.json
└── tsconfig.json
```

## Development

```bash
# Run tests
bun test

# Build standalone binary (optional)
bun run build:compile
```

## Notes

- **tmux/screen**: OSC 11 requires `set -g allow-passthrough on` in tmux config
- **Orphan protection**: Daemon self-terminates after 10 minutes (configurable)
- **Multiple sessions**: PID files are scoped by session ID, so concurrent Claude sessions work independently
- **Unsupported terminals**: OSC sequences are silently ignored — no errors or visual glitches

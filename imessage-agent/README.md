# Pi iMessage agent

Source-managed copy of Avyay's local Pi iMessage bridge.

Live locations on the Mac mini:

- Agent script: `~/.pi/agent-personal/imessage-agent/agent.mjs`
- Subagent helper: `~/.local/bin/pi-imessage-agent-message`
- Optional LaunchAgent: `~/Library/LaunchAgents/com.avyay.pi-personal-imessage-agent.plist`

Configure the live recipient with `PI_IMESSAGE_RECIPIENT`; do not hard-code phone numbers in this repo.

## Install/update live files

```bash
cp imessage-agent/agent.mjs ~/.pi/agent-personal/imessage-agent/agent.mjs
chmod 0755 ~/.pi/agent-personal/imessage-agent/agent.mjs
cp bin/pi-imessage-agent-message ~/.local/bin/pi-imessage-agent-message
chmod 0755 ~/.local/bin/pi-imessage-agent-message
```

## Prompt policy

The managed agent prompt requires: Always use subagents if a task looks like it will need more than 3 tool calls, or if any tool call is likely to take more than 5 seconds. The main iMessage/orchestrator session should reply quickly, delegate, and avoid blocking.

## Local subagent webhook

The agent exposes a localhost-only webhook by default:

- `GET /health`
- `POST /message`
- `POST /agent-message`

The bearer token is generated on first start at:

`~/.pi/agent-personal/imessage-agent/webhook-token`

Subagents should use the helper instead of calling the HTTP API directly:

```bash
pi-imessage-agent-message \
  --from build-agent \
  --text "Finished tests; all green." \
  --idempotency-key "build-agent:job-123:done" \
  --reply-mode imessage
```

Quiet context update:

```bash
printf 'Still running; no user-visible update needed.' | \
  pi-imessage-agent-message --from build-agent --reply-mode none
```

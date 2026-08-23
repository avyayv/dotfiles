# Global agent instructions

## Tool usage preferences

Do not use Python as the default solution for routine file inspection, search, or edits. Prefer the agent harness tools directly:

- Use `read` to inspect files.
- Use `edit` for precise in-place changes.
- Use `write` for creating or fully replacing files.
- Use shell tools like `rg`, `find`, `ls`, and project commands via `bash` when appropriate.

Only use Python when it is clearly the right tool for the task, such as running an existing Python project, doing nontrivial scripting/data processing, or when requested by the user.

## Coding style preferences

When a typed or validated optional value uses `null`/`undefined` to mean absent, prefer nullish coalescing (`??`) over verbose `typeof ... === "number"` fallback checks, so valid falsy values like `0` remain explicit.

Do not derive semantic identifiers such as `source_id` from physical source paths like `Path(__file__).resolve().parent`. Use explicit semantic IDs; if filesystem path resolution is required, perform it at the loader/bootstrap boundary and pass the result in.

## Checking capability claims against the fork

Before telling Avyay a library or feature is unsupported, check the version in use and whether the project has a newer fork. Do not conclude from the lockfile alone: check the currently installed fork (e.g. the pi packages under `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent`) and the upstream README/types for the API surface before saying a capability (structured output, tool choice, etc.) does not exist.

## Context Drop coordination

Default agent choice for delegated repo work unless Avyay changes it: Codex for hard architecture things, Claude Code for design/frontend work only (only the frontend parts), and Pi for normal run-of-the-mill coding shit.

When launching Context Drop agents, use `gpt-5.6-sol` with xhigh reasoning and fast service tier by default. Do not start `gpt-5.5` sessions unless Avyay explicitly requests that model.

When starting long-running Context Drop agents, make sure there is a local `context-drop schedule` status check running. If jobs look stale, blocked, or ambiguous, update that schedule to run every 15 minutes until the situation is clear. When there are no active long-running jobs or blockers left, remove/disable the status schedule so it stops texting noise.

Never close or kill Context Drop/tmux tabs unless Avyay explicitly asks, or for repo/code work, unless Avyay confirms the code has been merged to `main`. Completion, green CI, or PR creation is not enough.

If Avyay asks to clean up “dead tabs,” do not infer broadly or bulk-close. First list exact candidate tab names and ask for confirmation; if any tab corresponds to an unmerged/open PR or active review item, keep it open.

## Local links from this VM

This machine is accessed through a VM/tailnet setup. When giving the user clickable links or URLs for services running on this machine, do not use `localhost` or `127.0.0.1` in the displayed link. Replace the hostname with:

`avyays-mac-mini.tailf3cee5.ts.net`

Preserve the original scheme and port. Examples:

- `http://127.0.0.1:32820` -> `http://avyays-mac-mini.tailf3cee5.ts.net:32820`
- `http://localhost:8080` -> `http://avyays-mac-mini.tailf3cee5.ts.net:8080`

Use `localhost`/`127.0.0.1` only when showing commands or configuration that must run inside the VM itself.

When creating or surfacing a page/preview/document specifically for Avyay to open on his phone, reply with the direct clickable URL in the chat/iMessage message itself, not just a file path, status note, or server details.

When sending Avyay reports, markdown files, CSVs, or other generated artifacts, prefer a browser-accessible link over only a local file path. If the artifact is Markdown, render/serve it so it parses properly in a browser. Use the tailnet hostname above for links. Keep private data on local/tailnet-only services unless he explicitly asks for a truly public internet link.

For Vite dev/preview servers opened through the tailnet host, avoid the recurring `Blocked request. This host is not allowed` failure: either serve a built static directory with a tiny plain Node/static server, or configure both `server.allowedHosts` and `preview.allowedHosts` to include `avyays-mac-mini.tailf3cee5.ts.net` before sending the link.

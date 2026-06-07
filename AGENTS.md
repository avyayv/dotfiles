# Global agent instructions

## Tool usage preferences

Do not use Python as the default solution for routine file inspection, search, or edits. Prefer the agent harness tools directly:

- Use `read` to inspect files.
- Use `edit` for precise in-place changes.
- Use `write` for creating or fully replacing files.
- Use shell tools like `rg`, `find`, `ls`, and project commands via `bash` when appropriate.

Only use Python when it is clearly the right tool for the task, such as running an existing Python project, doing nontrivial scripting/data processing, or when requested by the user.

## Local links from this VM

This machine is accessed through a VM/tailnet setup. When giving the user clickable links or URLs for services running on this machine, do not use `localhost` or `127.0.0.1` in the displayed link. Replace the hostname with:

`mac-mini.tailf3cee5.ts.net`

Preserve the original scheme and port. Examples:

- `http://127.0.0.1:32820` -> `http://mac-mini.tailf3cee5.ts.net:32820`
- `http://localhost:8080` -> `http://mac-mini.tailf3cee5.ts.net:8080`

Use `localhost`/`127.0.0.1` only when showing commands or configuration that must run inside the VM itself.

## Mupt steppable-pi release workflow

When updating Mupt's fork of Pi:

1. In `/Users/avyay/code/dari/steppable-pi`, merge latest upstream `earendil-works/pi` into `main`.
2. Update `mupt-release` from the updated `main`.
3. Only publish these Mupt-scoped packages:
   - `@mupt-ai/pi-agent-core`
   - `@mupt-ai/pi-coding-agent`
4. Do not publish `pi-ai`, `pi-tui`, or `pi-web-ui` under `@mupt-ai`; keep those on `@earendil-works/*`.
5. Push `mupt-release`, then tag the `mupt-release` commit to trigger publish, for example:
   ```bash
   git checkout mupt-release
   git pull
   git tag v0.75.0-mupt.1
   git push origin v0.75.0-mupt.1
   ```
6. Verify npm after the workflow succeeds:
   ```bash
   npm view @mupt-ai/pi-agent-core@<version> version
   npm view @mupt-ai/pi-coding-agent@<version> version
   ```
7. The publish workflow must use npm OIDC trusted publishing with latest npm, e.g. `npx -y npm@latest publish ... --provenance`. Do not switch it back to plain bundled `npm publish`; the bundled npm previously signed provenance but failed trusted-publishing auth with npm 404.

After packages are published, update `/Users/avyay/code/dari/agent-host` to use the new versions:

- Bump `dari-backend/pi-runtime-packages.env`.
- Docker/runtime installs should use:
  - `@mupt-ai/pi-agent-core@<version>`
  - `@mupt-ai/pi-coding-agent@<version>`
  - `@earendil-works/pi-ai@<version>`
  - `@earendil-works/pi-tui@<version>`

# Global Claude instructions

## Local links from this VM

This machine is accessed through a VM/tailnet setup. When giving the user clickable links or URLs for services running on this machine, do not use `localhost` or `127.0.0.1` in the displayed link. Replace the hostname with:

`mac-mini.tailf3cee5.ts.net`

Preserve the original scheme and port. Examples:

- `http://127.0.0.1:32820` -> `http://mac-mini.tailf3cee5.ts.net:32820`
- `http://localhost:8080` -> `http://mac-mini.tailf3cee5.ts.net:8080`

Use `localhost`/`127.0.0.1` only when showing commands or configuration that must run inside the VM itself.

# Global Agent Instructions

## Tasks
When a new task is created, it is absolutely imperative that you do the work in a new worktree. Do not edit the main branch directly EVER. Always do the following before starting work on a new task

1. Pull latest version of main
2. Create a worktree
3. Switch to that worktree directory
4. Start working

## Subagents

When you need a subagent, open an agent within the same `herdr` workspace. You will be able to monitor it as you would any other way. But you should create another `herdr` agent in a new tab (name the tab accordingly) if you need a subagent.

## Sending Links

This machine is accessed through a VM/tailnet setup. When giving the user clickable links or URLs for services running on this machine, do not use `localhost` or `127.0.0.1` in the displayed link. Replace the hostname with:

`avyays-mac-mini.tailf3cee5.ts.net`

Preserve the original scheme and port. Examples:

- `http://127.0.0.1:32820` -> `http://avyays-mac-mini.tailf3cee5.ts.net:32820`
- `http://localhost:8080` -> `http://avyays-mac-mini.tailf3cee5.ts.net:8080`

## Sending Files

When I ask you to send files, you should always create a file that is viewable across the tailnet. That is, make it a link that's accessible via `http://avyays-mac-mini...`, and send the link to the file. Never mention raw file locations unless I explicitly ask you to.

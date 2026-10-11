# Global Agent Instructions

## Tasks
When a new task is created, it is absolutely imperative that you do the work in a new worktree. Do not edit the main branch directly EVER. However, if you are already in a NEW worktree (without dirty changes OR in a worktree which is clearly the same work) do not create a new worktree.

Use the local `gwt` worktree tooling (zsh functions from the dotfiles) so worktrees follow the house convention: they live in `~/.avyay-worktrees/` with `.env*` files and `node_modules` symlinked from the source checkout. Never run a bare `git worktree add` yourself and never create worktrees inside the repository directory.

Always do the following before starting work on a new task:

1. In the main repo checkout, pull the latest version of main: `git checkout main && git pull`
2. Create and enter the worktree: `zsh -ic '_gwt_create <branch-name>'` (non-interactive; branches from current HEAD — this is the same flow behind the `gwts` picker)
3. Work inside `~/.avyay-worktrees/<branch-name>`

When the work is merged, clean up with `zsh -ic 'gwtd'` (safe) or `gwtd!` (force) from inside the worktree.

## Previews

When asked to run, preview, or share a web app, use the `tunnel` tool (load the `tunnel-preview` skill first) — never hand back a `localhost:<port>` link and never hand-roll a proxy or mock server instead. The first command that brings the preview up must bring up the whole thing: the app plus its backend services (compose where the repo defines one), with env/secrets loaded and the app's public/OAuth URL set to the final tunnel hostname so sign-in works through the tunnel, not only on loopback. Verify with `tunnel doctor` and by checking the served content for the change under review before giving the link.

For self-bench worktrees specifically (shared `.env` holds the OAuth creds, session secret, and eval credential key; the API container serves the built app; Compose names the project after the directory and publishes an ephemeral host port):

```
SELFBENCH_PUBLIC_URL=http://selfbench-<task>.stack.avyayv.com:8000 docker compose --profile sandbox up -d --build
tunnel up --local --name selfbench-<task> --port "$(docker compose port api 8080 | cut -d: -f2)" .
```

Stop with `docker compose down` and `tunnel down selfbench-<task>`.

## Subagents

When you need a subagent, open an agent within the same `herdr` workspace. You will be able to monitor it as you would any other way. But you should create another `herdr` agent in a new tab (name the tab accordingly) if you need a subagent.

Use `dari codex --yolo`, `dari claude --dangerously-skip-permissions`, or `dari pi`, for your subagents, unless explicitly mentioned.

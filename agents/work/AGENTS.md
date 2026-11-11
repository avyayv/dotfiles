# Global Agent Instructions

## Tasks
When a new task is created, it is absolutely imperative that you do the work in a new worktree. Do not edit the main branch directly EVER. However, if you are already in a NEW worktree (without dirty changes OR in a worktree which is clearly the same work) do not create a new worktree.

Use `tunnel new` / `tunnel rm` (the `gwt*` zsh functions wrap them) so worktrees follow the house convention: they live in `~/.avyay-worktrees/` with `.env*` files and `node_modules` symlinked from the main checkout, and removing one also removes every preview and Compose stack started in it. Never run a bare `git worktree add` or `rm -rf` a worktree yourself, and never create worktrees inside the repository directory.

Always do the following before starting work on a new task:

1. In the main repo checkout, pull the latest version of main: `git checkout main && git pull`
2. Create the worktree: `tunnel new <branch-name>` (branches from current HEAD; prints the path)
3. Work inside `~/.avyay-worktrees/<branch-name>`

When the work is merged, clean up with `tunnel rm <worktree>`. It refuses uncommitted or untracked work; add `--force` only when that work can go. If disk runs low, `tunnel prune --dry-run` lists stacks left by worktrees deleted some other way, and `tunnel prune` removes them.

## Previews

When asked to run, preview, or share a web app, use the `tunnel` tool (load the `tunnel-preview` skill first) — never hand back a `localhost:<port>` link and never hand-roll a proxy or mock server instead. The first command that brings the preview up must bring up the whole thing: the app plus its backend services (compose where the repo defines one), with env/secrets loaded and the app's public/OAuth URL set to the final tunnel hostname so sign-in works through the tunnel, not only on loopback. Verify with `tunnel doctor` and by checking the served content for the change under review before giving the link.

Let tunnel start the Compose stack itself; don't run `docker compose up` and borrow it with `--local`, since nothing then stops it. For self-bench worktrees (shared `.env` holds the OAuth creds, session secret, and eval credential key; the API container serves the built app on an ephemeral host port):

```
tunnel up --name selfbench-<task> --build --profile sandbox --target api:8080 --url-env SELFBENCH_PUBLIC_URL .
```

The preview expires after 30 minutes (`tunnel extend selfbench-<task> 1h` for more); don't pass `--ttl never` unless asked. Stop it early with `tunnel down selfbench-<task>`. Its database volume is kept, and the next `tunnel up` in the same worktree reuses it.

## Subagents

When you need a subagent, open an agent within the same `herdr` workspace. You will be able to monitor it as you would any other way. But you should create another `herdr` agent in a new tab (name the tab accordingly) if you need a subagent.

Use `dari codex --yolo`, `dari claude --dangerously-skip-permissions`, or `dari pi`, for your subagents, unless explicitly mentioned.

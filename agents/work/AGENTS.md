# Global Agent Instructions

## Tasks
When a new task is created, it is absolutely imperative that you do the work in a new worktree. Do not edit the main branch directly EVER. However, if you are already in a NEW worktree (without dirty changes OR in a worktree which is clearly the same work) do not create a new worktree.

Worktrees, previews and their Docker stacks all go through `tunnel`, so deleting a worktree cleans up everything it started. Never run a bare `git worktree add`, `rm -rf` a worktree, or create worktrees inside the repository directory.

Always do the following before starting work on a new task:

1. In the main repo checkout, pull the latest version of main: `git checkout main && git pull`
2. Create the worktree: `tunnel new <branch-name>`. It branches from the current HEAD (`--from <ref>` for another start), links `.env*` files and `node_modules` from the main checkout, and prints the path (`~/.avyay-worktrees/<branch-name>`, slashes as dashes).
3. Work inside that path.

When the work is merged, clean up with `tunnel rm <worktree>`: it stops every preview and Compose stack started there, deletes their volumes and images, then removes the worktree. It refuses uncommitted or untracked work; add `--force` only when that work can go, and `--keep-volumes` to keep the data.

## Previews

When asked to run, preview, or share a web app, use `tunnel` (load the `tunnel-preview` skill first). Never hand back a `localhost:<port>` link, hand-roll a proxy or mock server, or run `docker compose up`/`down` yourself: a stack tunnel didn't start is never stopped. The first command that brings the preview up must bring up the whole thing: the app plus its backend services, with env/secrets loaded and the app's public/OAuth URL set to the final tunnel hostname so sign-in works through the tunnel, not only on loopback. Verify with `tunnel doctor` and by checking the served content for the change under review before giving the link.

- **Repos with a Compose file:** `tunnel up --name <repo>-<task> --build [--profile <p>] [--target <service>:<port>] [--url-env <PUBLIC_URL_VAR>] <worktree>`. Tunnel starts the stack, routes it, and stops it when the preview expires.
- **Apps without one** (a bare dev server): `tunnel up --local --name <repo>-<task> --port <port> <worktree>` only routes it, so stop the server yourself when done.
- **Self-bench** (shared `.env` holds the OAuth creds, session secret, and eval credential key; the API container serves the built app on an ephemeral host port):

  ```
  tunnel up --name selfbench-<task> --build --profile sandbox --target api:8080 --url-env SELFBENCH_PUBLIC_URL .
  ```

Previews expire after 30 minutes (`tunnel extend <name> 1h` for more); don't pass `--ttl never` unless asked. Rerun the same `tunnel up` after code changes to rebuild. Stop early with `tunnel down <name>`; its database volume is kept, and the next `tunnel up` in the same worktree reuses it.

## Disk Space

If the disk fills or Docker piles up, run `tunnel prune --dry-run`, then `tunnel prune`: it removes stacks whose worktree is gone, untagged images, and week-old build cache. Ask before deleting volumes any other way.

## Subagents

When you need a subagent, open an agent within the same `herdr` workspace. You will be able to monitor it as you would any other way. But you should create another `herdr` agent in a new tab (name the tab accordingly) if you need a subagent.

Use `dari codex --yolo`, `dari claude --dangerously-skip-permissions`, or `dari pi`, for your subagents, unless explicitly mentioned.

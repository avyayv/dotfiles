# agenttab

`agenttab` creates temporary worktrees for coding-agent A/B tests and opens them in tmux/iTerm.

```bash
go install ./cmd/agenttab

agenttab                                      # codex + pi
agenttab codex claude -- "implement X"
agenttab all -- "implement X"                # codex + claude + pi
agenttab pi claude my-ab -- "implement X"    # custom tmux session name
```

Behavior:

- Creates one fresh worktree per contestant under `~/.avyay-worktrees`.
- Copies tracked local changes and untracked non-ignored files into each contestant worktree.
- Symlinks `.env*` files and `node_modules` directories from the base worktree.
- Runs `codex --yolo`, `claude --yolo`, and `pi` as appropriate.
- Opens `pi` in the base/current worktree as the judge.
- Sends the prompt to contestants immediately.
- Sends the judge a coordinator prompt that explicitly tells it to wait until you say contestants are done.
- Never cleans up worktrees automatically.

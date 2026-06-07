# zsh-vibecoded-shortcuts

Custom ZSH functions for productivity workflows.

## Installation

Add to your `~/.zshrc`:

```zsh
source "$HOME/code/zsh-vibecoded-shortcuts/functions.zsh"
```

Then reload: `source ~/.zshrc`

## Functions

### `tmuxh [session_name]`

Creates a tmux session with iTerm2 integration (`-CC` flag) and a 2x2 grid of panes, all starting in the current directory.

```bash
tmuxh           # Creates session named "main"
tmuxh myproject # Creates session named "myproject"
```

### `tmux2` through `tmux8`

Creates a tmux session with that many tabs, all starting in the current directory. Tabs are not split by default. Pass `--vertical` or `-v` to split each tab into two side-by-side panes.

```bash
tmux8
tmux8 myproject
tmux8 --vertical
tmux8 myproject --vertical
```

### `dari_tmux` / `dari-tmux` / `dtmux`

Creates or attaches the persistent Dari tmux workspace. It starts with a `Company Context` tab that preserves/moves the existing long-running Codex session when present and verifies it is running `codex resume ... --yolo`; otherwise it restarts/resumes it with `--yolo`. It also starts an `orchestrator` tab running the iMessage Pi agent for the configured chat recipient.

```bash
dari_tmux
dari-tmux --restart-orchestrator
DARI_COMPANY_CODEX_SESSION_ID=<codex-session-id> dari_tmux
```

By default it stops the old launchd iMessage responder so only the tmux orchestrator replies. Use `--no-stop-imessage` to skip that.

### `gwts`

Switch between worktrees or create a new one (requires fzf). New worktrees are created from current HEAD with `.env*` files symlinked.

```bash
gwts       # Opens fzf picker - select a worktree or "+ Create new worktree"
gwts api   # Opens picker with initial query "api"
```

Inside the picker, use `Ctrl-V` or `Alt-V` to paste the macOS clipboard into the search query.

### `gwtn [--agent <agent>] [--branch <start-ref>] <branch-name> <prompt>`

Create a worktree branch, open it in a new tmux window (when inside tmux) or iTerm2 tab, and start a coding agent with the prompt submitted. Defaults to `pi` and branches from the current HEAD unless `--branch` is provided.

```bash
gwtn feat/foo "implement foo"
gwtn --agent claude --branch main feat/foo "implement foo"
```

### `gwtb`

Jump to the base (main) worktree from any worktree.

```bash
gwtb  # Returns to the main repository
```

### `gwtd` / `gwtd!`

Delete the current worktree and return to main repo. Use `gwtd!` to force delete even with uncommitted changes.

```bash
gwtd   # Safe delete (checks for uncommitted changes)
gwtd!  # Force delete
```

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

### `gwts`

Switch between worktrees or create a new one (requires fzf). New worktrees are created from current HEAD with `.env*` files symlinked.

```bash
gwts  # Opens fzf picker - select a worktree or "+ Create new worktree"
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

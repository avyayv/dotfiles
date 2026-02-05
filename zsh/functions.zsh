# Custom ZSH Functions

# Helper: create a new worktree from current HEAD or track remote branch
function _gwt_create() {
  echo -n "Branch name: "
  read new_branch
  if [ -z "$new_branch" ]; then
    echo "Cancelled"
    return 1
  fi
  local wt_name="${new_branch//\//-}"
  local wt_path="$HOME/.avyay-worktrees/$wt_name"
  local source_dir="$(git rev-parse --show-toplevel)"
  mkdir -p "$HOME/.avyay-worktrees"

  # Fetch latest remote refs
  git fetch --prune --quiet

  # Check if branch exists locally
  local local_branch="$(git for-each-ref --format='%(refname:short)' refs/heads/"$new_branch" 2>/dev/null)"
  # Check if branch exists on remote
  local remote_ref="$(git for-each-ref --format='%(refname:short)' refs/remotes/origin/"$new_branch" 2>/dev/null)"

  local wt_created=0
  if [ -n "$local_branch" ]; then
    # Branch exists locally - use it
    echo "Using existing local branch: $local_branch"
    git worktree add "$wt_path" "$new_branch" && wt_created=1
  elif [ -n "$remote_ref" ]; then
    # Branch exists on remote - track it
    echo "Tracking remote branch: $remote_ref"
    git worktree add --track -b "$new_branch" "$wt_path" "$remote_ref" && wt_created=1
  else
    # Create new branch from HEAD
    git worktree add -b "$new_branch" "$wt_path" HEAD && wt_created=1
  fi

  if [ "$wt_created" -eq 1 ]; then
    while IFS= read -r env_file; do
      local rel_path="${env_file#$source_dir/}"
      local target_dir="$wt_path/$(dirname "$rel_path")"
      mkdir -p "$target_dir"
      ln -s "$env_file" "$wt_path/$rel_path" && echo "Symlinked $rel_path"
    done < <(find "$source_dir" -name ".env*" -type f 2>/dev/null)
    cd "$wt_path"
  fi
}

# Delete current worktree and return to main repo
# Usage: gwtd (run from within a worktree)
function gwtd() {
  local current_dir="$(pwd)"
  local wt_root="$(git rev-parse --show-toplevel)"
  local main_worktree="$(git worktree list --porcelain | head -1 | cut -d' ' -f2)"

  # Check if we're in a worktree (not the main one)
  if [ "$current_dir" = "$main_worktree" ] || [[ "$current_dir" != *"/.avyay-worktrees/"* ]]; then
    echo "Not in a .avyay-worktrees worktree"
    return 1
  fi

  # Safety check: ensure wt_root is within .avyay-worktrees
  if [[ -z "$wt_root" ]] || [[ "$wt_root" != *"/.avyay-worktrees/"* ]]; then
    echo "Safety check failed: worktree root '$wt_root' is not in .avyay-worktrees"
    return 1
  fi

  # Check for uncommitted changes
  if ! git diff --quiet HEAD 2>/dev/null; then
    echo "Worktree has uncommitted changes. Use 'gwtd!' to force delete."
    return 1
  fi

  # Change to main worktree first, then remove
  cd "$main_worktree" || return 1
  git worktree remove "$wt_root" 2>/dev/null || {
    # If remove fails, prune stale entries and delete directory manually
    git worktree prune
    rm -rf "$wt_root"
  }
  echo "Removed worktree and returned to $main_worktree"
}

# Force delete worktree (even with uncommitted changes)
function gwtd!() {
  local current_dir="$(pwd)"
  local wt_root="$(git rev-parse --show-toplevel)"
  local main_worktree="$(git worktree list --porcelain | head -1 | cut -d' ' -f2)"

  if [ "$current_dir" = "$main_worktree" ] || [[ "$current_dir" != *"/.avyay-worktrees/"* ]]; then
    echo "Not in a .avyay-worktrees worktree"
    return 1
  fi

  if [[ -z "$wt_root" ]] || [[ "$wt_root" != *"/.avyay-worktrees/"* ]]; then
    echo "Safety check failed: worktree root '$wt_root' is not in .avyay-worktrees"
    return 1
  fi

  cd "$main_worktree" || return 1
  git worktree remove --force "$wt_root" 2>/dev/null || {
    git worktree prune
    rm -rf "$wt_root"
  }
  echo "Removed worktree and returned to $main_worktree"
}

# Jump to base (main) worktree
# Usage: gwtb
function gwtb() {
  local main_worktree="$(git worktree list --porcelain | head -1 | cut -d' ' -f2)"

  if [ -z "$main_worktree" ]; then
    echo "Not in a git repository"
    return 1
  fi

  cd "$main_worktree" || return 1
  echo "Switched to base worktree: $main_worktree"
}

# Switch to another worktree or create new (requires fzf)
# Usage: gwts
function gwts() {
  if ! command -v fzf &>/dev/null; then
    echo "fzf is required for interactive selection"
    return 1
  fi

  local worktrees="$(git worktree list 2>/dev/null)"
  if [ -z "$worktrees" ]; then
    echo "Not in a git repository"
    return 1
  fi

  local options="+ Create new worktree
$worktrees"
  local selected="$(echo "$options" | fzf --height=40% --reverse --prompt="Worktree: ")"
  if [ -z "$selected" ]; then
    return 0
  fi

  if [[ "$selected" == "+ Create new worktree" ]]; then
    _gwt_create
    return
  fi

  local wt_path="$(echo "$selected" | awk '{print $1}')"
  cd "$wt_path" || return 1
  echo "Switched to: $wt_path"
}

# Create tmux session with iTerm2 integration (-CC) and 2x2 grid
function tmuxh() {
  local session_name="${1:-main}"
  local start_dir="${PWD}"

  # Create detached session with 4 panes, then apply tiled layout
  tmux new-session -d -s "$session_name" -c "$start_dir"
  tmux split-window -t "$session_name" -c "$start_dir"
  tmux split-window -t "$session_name" -c "$start_dir"
  tmux split-window -t "$session_name" -c "$start_dir"
  tmux select-layout -t "$session_name" tiled

  # Attach with iTerm2 integration
  tmux -CC attach -t "$session_name"
}

# Create tmux session with N tabs, each horizontally split into 2 columns
function _tmux_tabs() {
  local num_tabs="$1"
  local session_name="${2:-main}"
  local start_dir="${PWD}"

  # Create session with first window (already split)
  tmux new-session -d -s "$session_name" -c "$start_dir"
  tmux split-window -h -t "$session_name" -c "$start_dir"

  # Create remaining windows, each with a horizontal split
  for i in $(seq 2 "$num_tabs"); do
    tmux new-window -t "$session_name" -c "$start_dir"
    tmux split-window -h -t "$session_name" -c "$start_dir"
  done

  # Select first window
  tmux select-window -t "$session_name:1"

  # Attach with iTerm2 integration
  tmux -CC attach -t "$session_name"
}

# Generate tmux2 through tmux8
for i in {2..8}; do
  eval "function tmux${i}() { _tmux_tabs $i \"\$1\"; }"
done

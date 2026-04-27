# Custom ZSH Functions

# Helper: create a new worktree from current HEAD or track remote branch
function _gwt_create() {
  local branch_input="$1"
  local new_branch="$branch_input"
  local remote_ref=""

  if [ -z "$new_branch" ]; then
    echo -n "Branch name: "
    read new_branch
  fi

  if [ -z "$new_branch" ]; then
    echo "Cancelled"
    return 1
  fi

  if git show-ref --verify --quiet "refs/remotes/$branch_input"; then
    remote_ref="$branch_input"
    new_branch="${branch_input#*/}"
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
  if [ -z "$remote_ref" ]; then
    remote_ref="$(git for-each-ref --format='%(refname:short)' refs/remotes/origin/"$new_branch" 2>/dev/null)"
  fi

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

    # Symlink every node_modules tree from the source worktree so LSPs resolve
    # types immediately. -prune stops find from descending into nested node_modules.
    while IFS= read -r nm_dir; do
      local rel_path="${nm_dir#$source_dir/}"
      local target_path="$wt_path/$rel_path"
      [ -e "$target_path" ] && continue
      mkdir -p "$(dirname "$target_path")"
      ln -s "$nm_dir" "$target_path" && echo "Symlinked $rel_path"
    done < <(find "$source_dir" -name "node_modules" -type d -prune 2>/dev/null)

    cd "$wt_path"
  fi
}

# Pick from local and remote branches when creating a new worktree
function _gwt_pick_branch() {
  git fetch --prune --quiet

  local branches="$(
    {
      git for-each-ref --sort='refname' --format=$'local\t%(refname:short)' refs/heads
      git for-each-ref --sort='refname' --format=$'remote\t%(refname:short)' refs/remotes | grep -v '/HEAD$'
    } | sed '/^$/d'
  )"

  if [ -z "$branches" ]; then
    echo "No branches found" >&2
    return 1
  fi

  local selected="$(printf '%s\n' "$branches" | fzf --height=50% --reverse --prompt="Branch: " --delimiter=$'\t' --with-nth=1,2)"
  if [ -z "$selected" ]; then
    return 0
  fi

  printf '%s\n' "${selected#*$'\t'}"
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

function _gwt_is_transient_path() {
  local wt_path="$1"
  [[ "$wt_path" == /private/* ]] || [[ "$wt_path" == /tmp/* ]] || [[ "$wt_path" == /var/folders/* ]]
}

function _gwt_list_visible_worktrees() {
  local current_worktree="$1"
  local line=""
  local wt_path=""

  git worktree prune --expire now >/dev/null 2>&1

  while IFS= read -r line; do
    [ -z "$line" ] && continue
    wt_path="${line%%[[:space:]]*}"

    if [ "$wt_path" = "$current_worktree" ]; then
      print -r -- "$line"
      continue
    fi

    [ -d "$wt_path" ] || continue

    if [[ "$wt_path" == "$HOME/.avyay-worktrees/"* ]]; then
      print -r -- "$line"
      continue
    fi

    if _gwt_is_transient_path "$wt_path"; then
      continue
    fi

    print -r -- "$line"
  done < <(git worktree list 2>/dev/null)
}

# Switch to another worktree or create new (requires fzf)
# Carries unstaged/staged changes to the target worktree and drops them from the source
# Usage: gwts [--new|-n]
function gwts() {
  if ! command -v fzf &>/dev/null; then
    echo "fzf is required for interactive selection"
    return 1
  fi

  if [ "$#" -gt 1 ]; then
    echo "Usage: gwts [--new|-n]"
    return 1
  fi

  if [ "$1" = "--new" ] || [ "$1" = "-n" ]; then
    local selected_branch="$(_gwt_pick_branch)"
    local pick_status=$?
    if [ "$pick_status" -ne 0 ]; then
      return "$pick_status"
    fi
    if [ -z "$selected_branch" ]; then
      return 0
    fi
    _gwt_create "$selected_branch"
    return
  fi

  if [ -n "$1" ]; then
    echo "Usage: gwts [--new|-n]"
    return 1
  fi

  local current_worktree="$(git rev-parse --show-toplevel 2>/dev/null)"
  local worktrees="$(_gwt_list_visible_worktrees "$current_worktree")"
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

  # Stash changes before switching (stash is shared across worktrees)
  local did_stash=0
  if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    git stash push --include-untracked -m "gwts: carry to worktree" --quiet && did_stash=1
    [ "$did_stash" -eq 1 ] && echo "Stashed changes from $(basename "$(git rev-parse --show-toplevel)")"
  fi

  local wt_path="$(echo "$selected" | awk '{print $1}')"
  cd "$wt_path" || return 1
  echo "Switched to: $wt_path"

  # Pop stashed changes into the target worktree
  if [ "$did_stash" -eq 1 ]; then
    if git stash pop --quiet 2>/dev/null; then
      echo "Applied changes to $(basename "$wt_path")"
    else
      echo "Warning: conflicts applying changes — stash preserved (use 'git stash pop' to retry)"
    fi
  fi
}

function _git_cleanup_main_merged_branches() {
  local base_ref=""
  local current_branch=""
  local merged_branches=""
  local response=""

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Not in a git repository"
    return 1
  fi

  if git show-ref --verify --quiet refs/remotes/origin/main; then
    base_ref="origin/main"
  elif git show-ref --verify --quiet refs/heads/main; then
    base_ref="main"
  elif git show-ref --verify --quiet refs/remotes/origin/master; then
    base_ref="origin/master"
  elif git show-ref --verify --quiet refs/heads/master; then
    base_ref="master"
  else
    echo "Could not find main or master"
    return 1
  fi

  current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  merged_branches="$(
    git for-each-ref --format='%(refname:short)' refs/heads | while IFS= read -r branch; do
      [ -z "$branch" ] && continue
      [ "$branch" = "$current_branch" ] && continue
      [ "$branch" = "main" ] && continue
      [ "$branch" = "master" ] && continue
      if git merge-base --is-ancestor "$branch" "$base_ref" 2>/dev/null; then
        printf '%s\n' "$branch"
      fi
    done
  )"

  if [ -z "$merged_branches" ]; then
    echo "No local branches merged into $base_ref"
    return 0
  fi

  echo "Local branches merged into $base_ref:"
  printf '%s\n' "$merged_branches" | sed 's/^/  /'
  echo -n "Delete these branches? [y/N]: "
  read response
  case "$response" in
    [Yy]|[Yy][Ee][Ss])
      ;;
    *)
      echo "Cancelled"
      return 0
      ;;
  esac

  printf '%s\n' "$merged_branches" | while IFS= read -r branch; do
    [ -z "$branch" ] && continue
    git branch -D -- "$branch"
  done
}

alias gbclean='_git_cleanup_main_merged_branches'

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

# Create tmux session with N tabs, optionally split each tab into 2 columns
function _tmux_tabs() {
  local num_tabs="$1"
  shift
  local session_name="main"
  local start_dir="${PWD}"
  local vertical_split=0

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --vertical|-v)
        vertical_split=1
        ;;
      --help|-h)
        echo "Usage: tmux${num_tabs} [session_name] [--vertical|-v]"
        return 0
        ;;
      --*)
        echo "Unknown option: $1"
        echo "Usage: tmux${num_tabs} [session_name] [--vertical|-v]"
        return 1
        ;;
      *)
        if [ "$session_name" != "main" ]; then
          echo "Unexpected argument: $1"
          echo "Usage: tmux${num_tabs} [session_name] [--vertical|-v]"
          return 1
        fi
        session_name="$1"
        ;;
    esac
    shift
  done

  # Create session with first window
  tmux new-session -d -s "$session_name" -c "$start_dir"
  if [ "$vertical_split" -eq 1 ]; then
    tmux split-window -h -t "$session_name:1" -c "$start_dir"
  fi

  # Create remaining windows
  for i in $(seq 2 "$num_tabs"); do
    tmux new-window -t "$session_name" -c "$start_dir"
    if [ "$vertical_split" -eq 1 ]; then
      tmux split-window -h -t "$session_name:$i" -c "$start_dir"
    fi
  done

  # Select first window
  tmux select-window -t "$session_name:1"

  # Attach with iTerm2 integration
  tmux -CC attach -t "$session_name"
}

# Generate tmux2 through tmux8
for i in {2..8}; do
  eval "function tmux${i}() { _tmux_tabs $i \"\$@\"; }"
done

# Wrap `claude` so `--yolo` is an alias for `--dangerously-skip-permissions`
function claude() {
  local args=()
  local a
  for a in "$@"; do
    if [ "$a" = "--yolo" ]; then
      args+=("--dangerously-skip-permissions")
    else
      args+=("$a")
    fi
  done
  command claude "${args[@]}"
}

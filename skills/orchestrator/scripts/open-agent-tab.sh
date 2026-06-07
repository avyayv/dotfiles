#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: open-agent-tab.sh --branch <branch> --prompt <prompt> [options]

Options:
  --session <name>     tmux session to open the window in (default: $DARI_ORCHESTRATOR_TMUX_SESSION or dari)
  --repo <path>        source repo path (default: $DARI_AGENT_HOST_DIR or ~/code/dari/agent-host)
  --start-ref <ref>    ref for new branches (default: origin/main, fallback: HEAD)
  --agent <command>    agent command to run (default: pi)
  --name <name>        tmux window name (default: branch with / replaced by -)
  --help               show this help
USAGE
}

session="${DARI_ORCHESTRATOR_TMUX_SESSION:-dari}"
repo="${DARI_AGENT_HOST_DIR:-$HOME/code/dari/agent-host}"
start_ref="origin/main"
agent="pi"
branch=""
prompt=""
window_name=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --session)
      shift
      session="${1:-}"
      ;;
    --repo)
      shift
      repo="${1:-}"
      ;;
    --start-ref)
      shift
      start_ref="${1:-}"
      ;;
    --agent)
      shift
      agent="${1:-}"
      ;;
    --branch)
      shift
      branch="${1:-}"
      ;;
    --prompt)
      shift
      prompt="${1:-}"
      ;;
    --name)
      shift
      window_name="${1:-}"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift || true
done

if [ -z "$branch" ] || [ -z "$prompt" ]; then
  usage >&2
  exit 1
fi

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required" >&2
  exit 1
fi

if ! tmux has-session -t "$session" 2>/dev/null; then
  echo "tmux session not found: $session" >&2
  exit 1
fi

if [ ! -d "$repo" ]; then
  echo "repo does not exist: $repo" >&2
  exit 1
fi

source_dir="$(cd "$repo" && git rev-parse --show-toplevel)"
mkdir -p "$HOME/.avyay-worktrees"

git -C "$source_dir" fetch --prune --quiet || true

branch_input="$branch"
remote_ref=""
if git -C "$source_dir" show-ref --verify --quiet "refs/remotes/$branch_input"; then
  remote_ref="$branch_input"
  branch="${branch_input#*/}"
elif git -C "$source_dir" show-ref --verify --quiet "refs/remotes/origin/$branch"; then
  remote_ref="origin/$branch"
fi

wt_name="${branch//\//-}"
wt_path="$HOME/.avyay-worktrees/$wt_name"

if git -C "$wt_path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Using existing worktree: $wt_path"
else
  if [ -e "$wt_path" ]; then
    echo "worktree path exists but is not a git worktree: $wt_path" >&2
    exit 1
  fi

  if git -C "$source_dir" show-ref --verify --quiet "refs/heads/$branch"; then
    echo "Using existing local branch: $branch"
    git -C "$source_dir" worktree add "$wt_path" "$branch"
  elif [ -n "$remote_ref" ]; then
    echo "Tracking remote branch: $remote_ref"
    git -C "$source_dir" worktree add --track -b "$branch" "$wt_path" "$remote_ref"
  else
    if ! git -C "$source_dir" rev-parse --verify --quiet "$start_ref^{commit}" >/dev/null; then
      start_ref="HEAD"
    fi
    echo "Creating branch $branch from $start_ref"
    git -C "$source_dir" worktree add -b "$branch" "$wt_path" "$start_ref"
  fi

  while IFS= read -r env_file; do
    [ -n "$env_file" ] || continue
    rel_path="${env_file#$source_dir/}"
    target_path="$wt_path/$rel_path"
    [ -e "$target_path" ] && continue
    mkdir -p "$(dirname "$target_path")"
    ln -s "$env_file" "$target_path" && echo "Symlinked $rel_path"
  done < <(find "$source_dir" -name ".env*" -type f 2>/dev/null)

  while IFS= read -r nm_dir; do
    [ -n "$nm_dir" ] || continue
    rel_path="${nm_dir#$source_dir/}"
    target_path="$wt_path/$rel_path"
    [ -e "$target_path" ] && continue
    mkdir -p "$(dirname "$target_path")"
    ln -s "$nm_dir" "$target_path" && echo "Symlinked $rel_path"
  done < <(find "$source_dir" -name "node_modules" -type d -prune 2>/dev/null)
fi

if [ -z "$window_name" ]; then
  window_name="$wt_name"
fi

quoted_wt="$(printf '%q' "$wt_path")"
quoted_prompt="$(printf '%q' "$prompt")"
run_cmd="cd $quoted_wt && $agent $quoted_prompt"

target="$(tmux new-window -P -F '#{session_name}:#{window_index}' -t "$session:" -c "$wt_path" -n "$window_name")"
tmux send-keys -t "$target" "$run_cmd" C-m

echo "Opened $target ($window_name) in $wt_path"

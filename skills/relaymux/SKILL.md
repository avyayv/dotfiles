---
name: relaymux
description: Use relaymux directly or as a base layer for skills that launch, monitor, notify, schedule, or steer local CLI agents in tmux. Lightweight reference for relaymux mental model and core commands.
---

# relaymux

Use this skill whenever you are using relaymux itself, or when another skill delegates work through relaymux.

## Mental Model

- relaymux coordinates local CLI agents in tmux windows/tabs, not panes.
- The background daemon/local API runs outside tmux when installed.
- Config, state, logs, prompts, scratch, reports, and the SQLite DB live under `~/.relaymux` by default.
- `relaymux status` is the source of truth for relaymux-launched runs.
- Use `--session` only when you explicitly want a separate/named tmux session. The default is the shared configured session.

## Core Commands

Setup / health:

```bash
relaymux setup
relaymux status
relaymux doctor
relaymux status-launch-agent --json
```

Launch an agent in a repo:

```bash
relaymux launch \
  --repo <repo-path> \
  --agent <pi|codex|claude|other> \
  --name <short-window-name> \
  --prompt '<specific task, constraints, validation, reporting instructions>'
```

Prefer a prompt file for long prompts:

```bash
relaymux launch \
  --repo <repo-path> \
  --agent <agent> \
  --name <short-window-name> \
  --prompt-file /tmp/<task>-prompt.md
```

Launch in/create a worktree when appropriate:

```bash
relaymux launch \
  --repo <source-repo> \
  --worktree <worktree-path> \
  --create-worktree \
  --worktree-branch <branch-name> \
  --worktree-from origin/main \
  --agent <agent> \
  --name <short-window-name> \
  --prompt-file /tmp/<task>-prompt.md
```

Ask the relaymux daemon a one-off question/request:

```bash
relaymux ask '<request>' --reply-mode none
relaymux ask '<request>' --no-wait --reply-mode imessage
```

Notify/report completion from a subagent:

```bash
relaymux notify \
  --from <subagent-name> \
  --reply-mode imessage \
  --idempotency-key '<stable-task-key>-done' \
  --message 'Done: summary. Validation: commands/results. Blockers: none or list.'
```

Use `--reply-mode none` for quiet context-only updates. Use `--suicide` only when the current tmux window is disposable and the task policy permits closing it.

Schedule recurring relaymux asks:

```bash
relaymux schedule add \
  --name <name> \
  --prompt '<prompt>' \
  --cron '*/15 * * * *' \
  --reply-mode none

relaymux schedule list
relaymux schedule remove --name <name>
```

## Prompt Shape For Delegated Agents

Make delegated prompts self-contained:

- repo/worktree path
- exact task scope and non-goals
- files/areas to inspect first, if known
- repo instructions to read before editing
- validation commands to run
- required final `relaymux notify` command

For multi-line or high-stakes prompts, write a prompt file and pass `--prompt-file` instead of stuffing everything into the shell command.

## Steering Existing Runs

- If a follow-up belongs to an existing relaymux run, steer that run instead of launching a duplicate.
- Do not paste multi-line steering text directly into interactive TUIs that split input by newline. Write the instruction to `/tmp/<task>-followup.md` and send one line like: `Read and apply /tmp/<task>-followup.md`.
- If a run is already confused by fragmented steering, stop and restart only when the task policy allows it.

## Safety Rules

- Do not overwrite, revert, or race another agent's work.
- Do not close or kill relaymux/tmux code-task windows unless Avyay explicitly asks, or repo policy says the work has been merged and is safe to clean up.
- For long-running delegated work, keep a lightweight local `relaymux schedule` status check running when needed; remove it when there are no active long-running jobs or blockers.
- Report status concisely: what is running, what is blocked, and what needs Avyay.

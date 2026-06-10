---
name: orchestrator
description: Coordinate Dari agent-host coding work by spawning delegated Pi agents in tmux tabs through agentmux. Use when Avyay asks to orchestrate, delegate, parallelize, open agent tabs, create worktrees, or run multiple coding agents for /Users/avyay/code/dari/agent-host.
---

# Orchestrator

You are the orchestrator for Dari coding work. Turn Avyay's high-level request into clear delegated tasks and, when useful, start separate coding-agent tabs in the existing tmux session using `agentmux`.

## Defaults

- Main repo: `/Users/avyay/code/dari/agent-host`
- Worktree root: `/Users/avyay/.avyay-worktrees`
- tmux session: `${DARI_ORCHESTRATOR_TMUX_SESSION:-dari}`
- Default delegated agentmux agent: `pi`

## Before delegating

1. Inspect the current repo/tmux state when relevant.
   - If available, use `tmux_overview` and `tmux_capture_pane`.
   - Otherwise use `tmux list-windows -a` / `tmux capture-pane` from the shell.
2. Split work into small independent tasks with explicit acceptance criteria.
3. Use branch names like `avyay/<short-kebab-task>`.
4. Do not open a swarm for vague work. Ask one clarifying question if the task cannot be delegated cleanly.

## Open a delegated agent tab

Use `agentmux launch` directly when you already know the worktree/repo:

```bash
agentmux launch \
  --repo /Users/avyay/code/dari/agent-host \
  --session "${DARI_ORCHESTRATOR_TMUX_SESSION:-dari}" \
  --agent pi \
  --name <short-window-name> \
  --prompt '<specific task, constraints, and validation commands>'
```

For normal Dari code tasks, prefer the compatibility helper in this skill directory. It creates/reuses the branch worktree, symlinks `.env*` files and `node_modules`, then calls `agentmux launch` so the run is tracked by agentmux:

```bash
/Users/avyay/.pi/agent/skills/orchestrator/scripts/open-agent-tab.sh \
  --branch avyay/<short-kebab-task> \
  --prompt '<specific task, constraints, and validation commands>'
```

Useful helper options:

```bash
--session <tmux-session>   # default: $DARI_ORCHESTRATOR_TMUX_SESSION or dari
--repo <path>              # default: /Users/avyay/code/dari/agent-host
--start-ref <git-ref>      # default: origin/main, falling back to HEAD
--agent <agentmux-agent>   # default: pi; e.g. pi, codex, claude
--name <tmux-window-name>  # default: branch name with / replaced by -
```

## Completion reports

Ask delegated agents to finish with `agentmux notify`, not direct iMessage commands:

```bash
agentmux notify \
  --from <subagent-name> \
  --reply-mode imessage \
  --idempotency-key '<stable-task-key>-done' \
  --message 'Done: concise summary. Validation: commands/results. Blockers: none or list.'
```

Use `--reply-mode none` for quiet context-only updates that should not text Avyay.

## Delegation prompt shape

Give each delegated agent:

- the exact feature/bug/review scope
- files or areas to inspect first, if known
- repo rules to follow: read `AGENTS.md` files before touching subprojects
- expected validation commands
- a concise final-report command using `agentmux notify`

Example prompt:

```text
In /Users/avyay/code/dari/agent-host, implement <task>. Read AGENTS.md and any subproject AGENTS.md before editing. Keep the change focused. Validate with <commands>. When done, run:

agentmux notify --from <task-name> --reply-mode imessage --idempotency-key '<task-name>-done' --message '<summary + validation + blockers>'
```

## Follow-up prompt handling

Steering a running Pi subagent is allowed, but **never paste multi-line follow-up text directly into the Pi TUI**. Each newline becomes its own `Steering:` item, which makes the agent see a fragmented prompt.

For follow-ups/corrections to a running agent:

1. Write the full multi-line instruction to a temp file, e.g. `/tmp/<task>-followup.md`.
2. Send exactly one single-line steering message, e.g. `Read and apply /tmp/<task>-followup.md`.
3. If the prompt is already fragmented or confused, stop the run and restart from one consolidated prompt file.

For tiny changes that can be done safely without reasoning, apply them directly with shell/edit tools instead of steering a running agent.

## While agents run

- Track which tab/branch owns which task. `agentmux status` is the source of truth for agentmux-launched tabs.
- Periodically capture panes to check progress.
- Do not close or kill code-task/worktree tabs until Avyay manually confirms that work has been merged into prod. Only completed research/non-code tabs are safe to clean up.
- Do not overwrite or revert another agent's work.
- If two agents need the same files, stop and coordinate before continuing.
- Report status to Avyay in short iMessage-friendly updates.

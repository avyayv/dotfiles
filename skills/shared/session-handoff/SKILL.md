---
name: session-handoff
description: Write a concise current-session handoff to a local temp Markdown file for another/new agent. Use when Avyay asks to handoff context, transfer this session, make a tmp context file, continue in a new chat, or produce a restart/agent handoff.
---

# Session Handoff

Write the useful context from the current session into a temp Markdown file that Avyay can point a new agent/chat at.

Default output directory:

```text
/tmp/pi-handoffs/
```

## Trigger

Use this skill when Avyay asks for a handoff, context dump, tmp file, continuation prompt, restart context, or says he wants to reference the current session from another agent/chat.

Do not ask clarifying questions unless the target/focus is genuinely ambiguous. Prefer producing a good-enough handoff quickly.

## Workflow

1. Infer the handoff topic from the user request and current session.
2. Collect only relevant facts from the conversation and workspace.
3. If currently in or near a repo, inspect lightweight state:
   - `pwd`
   - `git rev-parse --show-toplevel 2>/dev/null`
   - `git branch --show-current 2>/dev/null`
   - `git status --short 2>/dev/null`
   - `git log -1 --oneline 2>/dev/null`
   - PR/issue URL only if already known or directly relevant.
4. Choose a file path under `/tmp/pi-handoffs/`, using this shape:
   - `/tmp/pi-handoffs/YYYYMMDD-HHMMSS-<short-topic-slug>.md`
5. Write the handoff Markdown file.
6. Verify it exists with `ls -l <path>` or `wc -c <path>`.
7. Reply with:
   - the exact file path
   - a one-line prompt Avyay can paste into the new chat, e.g. `Read /tmp/pi-handoffs/<file>.md and continue from Next steps.`

## Handoff Template

Use this structure. Omit sections that truly do not apply, but keep `TL;DR`, `Current state`, and `Next steps`.

```md
# Session Handoff: <topic>

Created: <local timestamp>
Source cwd: <pwd>
Repo: <repo root or n/a>
Branch: <branch or n/a>
Related PR/issue: <url/id or n/a>

## New-agent prompt

Read this file, then continue the task from `Next steps`. Trust the file paths and command results below over guesses. If anything conflicts with live repo state, inspect the repo and update your plan.

## TL;DR

<3-7 bullets with the important state and what the next agent should do.>

## User ask / intent

<What Avyay wanted, including preferences/taste/process constraints stated in this session.>

## Current state

<What is done, what is partially done, what is not done. Include repo/branch/status facts.>

## What happened in this session

<Chronological but concise bullets. Include decisions, pivots, and why.>

## Files and code locations to inspect

- `<path>` — <why it matters>

## Commands run / validation

- `<command>` — <result/status>

If validation was not run, say that explicitly.

## Decisions / constraints

- <decision or constraint>

## Open questions / blockers

- <question/blocker or `None known`>

## Next steps

1. <specific next action>
2. <specific next action>
3. <specific validation/reporting action>

## Risks / gotchas

- <risk, stale assumption, race, uncommitted state, failing test, etc.>

## Do not do

- <things Avyay or the session explicitly ruled out>
```

## Writing Rules

- Be factual and specific; do not invent history, commands, PRs, tests, or decisions.
- Prefer exact paths, branch names, command names, URLs, ports, and error messages.
- Mark unknowns as `Unknown` or `Not checked` instead of guessing.
- Keep it concise enough for a new agent to read quickly.
- Do not include secrets, API keys, tokens, private credentials, or unnecessary personal data.
- Do not dump large diffs or full logs unless the exact content is required; summarize and point to files/commands.
- If there are uncommitted changes, mention that prominently in `Current state` and `Risks / gotchas`.
- If this hands off delegated/Context Drop work, include tmux tab names, worktree paths, branch names, PR URLs, and any schedule/status-check state that matters.

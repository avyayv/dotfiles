---
name: implementation-journal
description: Keep an outside-repo implementation journal for multi-file, long-running, delegated, or ambiguity-prone coding work. Use when implementation may discover unknowns, deviate from plan, touch architecture/data/API/UX, or run longer than about 20 minutes.
---

# Implementation Journal

Use this skill for nontrivial implementation work where decisions may be discovered during the task.

The journal is scratch coordination state. Keep it outside the repo by default so it does not pollute diffs or get accidentally committed.

## Location

Default path:

```text
/Users/avyay/.relaymux/state/implementation-notes/<repo>/<branch-or-task>.md
```

Derive `<repo>` from the git repo directory name when possible. Derive `<branch-or-task>` from the git branch, PR number, or a short task slug.

Only write notes inside the repo if Avyay explicitly asks for durable project docs or a PR artifact.

## When To Use

Use when any of these are true:

- The task touches multiple files or service boundaries.
- The implementation may run for more than about 20 minutes.
- The plan has meaningful product, API, data-model, UX, deployment, or compatibility assumptions.
- The work is delegated to subagents or spans multiple sessions.
- Avyay asks for implementation notes, a journal, deviations, or a scratchpad.

## Journal Template

Create or update the note with this structure:

```md
# Implementation Journal: <task>

Repo:
Worktree:
Branch:
PR:
Task:
Started:
Agent:

## Current Plan

## Assumptions

## Decisions Made

## Deviations From Plan

## Stop-And-Ask Conditions Hit

## Validation

## Open Questions

## Follow-Ups For Avyay

## Final Handoff Summary
```

## Process

1. Before coding, create the journal and record the current plan and assumptions.
2. During coding, append concise notes only when something materially changes: discovered constraint, changed approach, product/API/data/UX uncertainty, validation surprise, or skipped validation.
3. If a deviation is purely mechanical and low risk, choose the conservative option, log it, and continue.
4. If a deviation changes product semantics, API contracts, data shape, persistent storage, deployment behavior, security posture, user-facing UX, or compatibility expectations, stop and ask Avyay before proceeding.
5. At the end, write a final handoff summary with what changed, validation run, remaining risk, and any follow-up decisions.

## Rules

- Keep notes concise and factual.
- Do not dump command logs unless the exact output matters.
- Do not include secrets or private token values.
- Do not use the journal as a substitute for tests or PR description.
- Durable conclusions should be copied into the PR body, report, docs, or final response; the journal remains scratch state.
- If no meaningful deviations occurred, say that explicitly in the final handoff.

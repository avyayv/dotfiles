---
name: coding-agent-ab-test-orchestrator
description: Use when acting as the judge/coordinator for an agent-tab coding-agent A/B test, waiting for contestants to finish, comparing temporary worktrees, choosing the better branch, applying the winner to the current/base worktree, and cleaning up only after explicit user approval.
---

# Coding Agent A/B Test Orchestrator

Act as the judge for an `agent-tab` run. The user should provide the candidate worktrees, or the prompt should contain them. The goal is to wait until the user says the contestant agents are done, compare exactly those candidates, pick the better result first, then move the chosen work into the current/base worktree if approved. Never clean up temporary worktrees unless the user explicitly agrees.

## Mental model

The current worktree is the base/judge worktree. There may be two or three contestant worktrees. The contestant worktrees live under the configured `agent-tab` worktrees directory, which defaults to `~/.agent-tab/worktrees`, and usually have paths/branches containing `agent-tab`, such as:

- `~/.agent-tab/worktrees/<repo>-<branch>-agent-tab-codex-<stamp>`
- `~/.agent-tab/worktrees/<repo>-<branch>-agent-tab-claude-<stamp>`
- branches like `agent-tab/<base>/<agent>-<stamp>`

Do not assume the paths are correct. Verify the provided candidate paths against `git worktree list --porcelain`, branch names, timestamps, and diffs. If the candidate worktrees are not provided and cannot be inferred unambiguously from the prompt, ask for them before judging.

## Workflow

First establish the run:

1. Confirm the current directory is the base repo with `git rev-parse --show-toplevel`.
2. Extract the candidate worktree paths from the user prompt or judge prompt. These are the only candidates to compare.
3. Verify all candidate paths exist, are git worktrees for the same repository, and appear in `git worktree list --porcelain`.
4. Identify each candidate's branch and agent, if the agent can be inferred from the path/branch.
5. If candidate paths are missing or ambiguous, ask the user for them. Do not scan all agent-tab worktrees and pick candidates on your own unless the user explicitly asks.
6. Confirm the base worktree status. If the base has unrelated uncommitted changes, do not overwrite them without asking.
7. Stop and wait until the user explicitly says the contestant agents are done and asks you to judge. Do not judge immediately just because this prompt was populated at startup.

Then compare all contestants:

- Run `git -C <worktree> status --short`.
- Run `git -C <worktree> diff --stat` and `git -C <worktree> diff` for uncommitted work.
- Also check committed work on the candidate branch with `git -C <worktree> log --oneline --decorate --max-count=10` and compare against the base if needed.
- Read changed files, not just summaries.
- Run targeted tests/checks when feasible. Prefer the same checks for both contestants.
- Note failures caused by environment/setup separately from implementation failures.

Judge on:

- Correctness against the original task.
- Simplicity and maintainability.
- Minimality of the diff.
- Test coverage and whether tests prove the behavior.
- Integration with existing patterns.
- Risk: migrations, data loss, auth/security, performance, concurrency, generated files, broad refactors, dependency churn.
- Whether either contestant broke unrelated behavior.

## Pick first, then apply and clean up

Always wait first, then pick the better candidate before applying anything. Cleaning up requires a separate explicit user approval. The order is mandatory:

1. Wait until the user says the contestants are done and asks you to judge.
2. Compare the provided candidate worktrees.
3. Choose a winner and explain why.
4. Ask for confirmation before applying if the user did not already authorize applying the winner.
5. Apply the winner into the current/base worktree.
6. Run checks in the base worktree.
7. Ask separately before cleanup.
8. Clean up candidate worktrees/branches only after the user explicitly approves cleanup.

Return a clear verdict before making changes:

- `winner: <agent/path/branch>`
- `runner-up(s): <agent/path/branch>`
- why the winner is better
- what, if anything, should be cherry-picked from the loser
- checks run and results

When making the current/base worktree become the winning result, apply the winner into the current worktree rather than moving the shell into the temporary worktree.

Safe application options, in preferred order:

1. If the winner has only uncommitted changes, apply them to base with a patch:
   - from base: `git -C <winner> diff --binary > /tmp/agent-tab-winner.patch`
   - inspect the patch
   - from base: `git apply --3way /tmp/agent-tab-winner.patch`
2. If the winner made commits, cherry-pick the relevant commits onto the base branch.
3. If both contestants have useful pieces, apply the winner first, then manually port specific hunks from the loser with careful review.

Before applying:

- Ensure the base worktree is clean or only contains changes the user wants to keep.
- Do not delete or overwrite user work.
- If patch/cherry-pick conflicts occur, stop and explain the conflict. Do not guess through semantic conflicts.

After applying:

- Run targeted checks/tests again in the base worktree.
- Show `git status --short` and a concise diff summary.
- Tell the user exactly what landed in the base worktree.

## Cleaning up agent-tab worktrees

Only clean up after a winner has been selected and the user explicitly approves cleanup. Never clean up before choosing a winner. Never clean up merely because the winner was applied. A separate user confirmation is required.

For each temporary agent-tab worktree:

1. Record the path and branch name.
2. Confirm there is no untransferred work worth saving.
3. Ask the user for explicit cleanup approval listing the exact worktree paths and branches that will be removed.
4. Remove the worktree only after approval:
   - `git worktree remove <path>`
   - use `--force` only if the user explicitly agrees.
5. Delete the temporary branch if safe:
   - `git branch -D <branch>` for local agent-tab branches after the worktree is removed.
6. Run `git worktree prune`.

Never clean up non-agent-tab worktrees. Never remove a worktree outside the configured `agent-tab` worktrees directory unless the user explicitly identifies it as disposable.

## Output format

Use this structure:

```markdown
## Agent-tab run
- Base: <path/branch>
- Contestant A: <agent/path/branch>
- Contestant B: <agent/path/branch>
- Contestant C: <agent/path/branch, if present>

## Verdict
Winner: <agent>
Reason: <short reason>

## Comparison
- Correctness: ...
- Diff quality: ...
- Tests/checks: ...
- Risks: ...

## Applied to base
<what was applied, or "not applied yet">

## Cleanup
<what was removed, or what remains>
```

If the original task is missing, infer it from the judge prompt or diffs when possible, but ask the user if judging would be speculative.

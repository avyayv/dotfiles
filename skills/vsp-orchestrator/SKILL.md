---
name: vsp-orchestrator
description: Use when acting as the judge/coordinator for a vsp/agentab A/B coding-agent run, comparing two temporary worktrees, choosing the better branch, applying the winner to the current/base worktree, and cleaning up the temporary vsp worktrees/branches.
---

# VSP Orchestrator

Act as the judge for a `vsp` / `agentab` run. The user should provide the two candidate worktrees, or the prompt should contain them. The goal is to compare exactly those two candidates, pick the better result first, then move the chosen work into the current/base worktree and clean up the temporary vsp worktrees safely.

## Mental model

The current worktree is the base/judge worktree. The contestant worktrees live under `~/.avyay-worktrees` and usually have paths/branches containing `vsp`, such as:

- `~/.avyay-worktrees/<repo>-<branch>-vsp-codex-<stamp>`
- `~/.avyay-worktrees/<repo>-<branch>-vsp-claude-<stamp>`
- branches like `vsp/<base>/<agent>-<stamp>`

Do not assume the paths are correct. Verify the two provided candidate paths against `git worktree list --porcelain`, branch names, timestamps, and diffs. If the two candidate worktrees are not provided and cannot be inferred unambiguously from the prompt, ask for them before judging.

## Workflow

First establish the run:

1. Confirm the current directory is the base repo with `git rev-parse --show-toplevel`.
2. Extract the two candidate worktree paths from the user prompt or judge prompt. These are the only candidates to compare.
3. Verify both paths exist, are git worktrees for the same repository, and appear in `git worktree list --porcelain`.
4. Identify each candidate's branch and agent, if the agent can be inferred from the path/branch.
5. If either candidate path is missing or ambiguous, ask the user for the two paths. Do not scan all vsp worktrees and pick a pair on your own unless the user explicitly asks.
6. Confirm the base worktree status. If the base has unrelated uncommitted changes, do not overwrite them without asking.

Then compare both contestants:

- Run `git -C <worktree> status --short`.
- Run `git -C <worktree> diff --stat` and `git -C <worktree> diff` for uncommitted work.
- Also check committed work on the vsp branch with `git -C <worktree> log --oneline --decorate --max-count=10` and compare against the base if needed.
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

Always pick the better candidate before applying anything or cleaning anything up. The order is mandatory:

1. Compare the two provided candidate worktrees.
2. Choose a winner and explain why.
3. Ask for confirmation before applying if the user did not already authorize applying the winner.
4. Apply the winner into the current/base worktree.
5. Run checks in the base worktree.
6. Clean up the two candidate worktrees/branches after the chosen work is safely applied or the user explicitly says to discard the run.

Return a clear verdict before making changes:

- `winner: <agent/path/branch>`
- `runner-up: <agent/path/branch>`
- why the winner is better
- what, if anything, should be cherry-picked from the loser
- checks run and results

When making the current/base worktree become the winning result, apply the winner into the current worktree rather than moving the shell into the temporary worktree.

Safe application options, in preferred order:

1. If the winner has only uncommitted changes, apply them to base with a patch:
   - from base: `git -C <winner> diff --binary > /tmp/vsp-winner.patch`
   - inspect the patch
   - from base: `git apply --3way /tmp/vsp-winner.patch`
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

## Cleaning up vsp worktrees

Only clean up after a winner has been selected and either the winner has been applied to base or the user says to discard the run. Never clean up before choosing a winner.

For each temporary vsp worktree:

1. Record the path and branch name.
2. Confirm there is no untransferred work worth saving.
3. Remove the worktree:
   - `git worktree remove <path>`
   - use `--force` only if the user explicitly agrees or the work has already been intentionally applied/discarded.
4. Delete the temporary branch if safe:
   - `git branch -D <branch>` for local vsp branches after the worktree is removed.
5. Run `git worktree prune`.

Never clean up non-vsp worktrees. Never remove a worktree outside `~/.avyay-worktrees` unless the user explicitly identifies it as disposable.

## Output format

Use this structure:

```markdown
## VSP run
- Base: <path/branch>
- Contestant A: <agent/path/branch>
- Contestant B: <agent/path/branch>

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

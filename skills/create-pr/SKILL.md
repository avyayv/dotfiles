---
name: create-pr
description: Create or update a GitHub pull request with a concise Summary, a Design section that includes code locations, and honest Validation results. Use when the user asks to create/open/file a PR or invokes create-pr.
---

# Create PR

Create a GitHub PR from the current branch with a useful, skim-friendly body.

## Workflow

1. Inspect repo state before writing the PR:
   - current branch and default/base branch
   - existing PR for the branch
   - `git status --short`
   - commits, diff stat, changed files, and relevant hunks against the base branch
2. If there are uncommitted changes, stop and ask whether to include/commit them unless the user already said they are intentional.
3. Infer a short PR title from the actual change. Prefer concrete user impact over implementation detail.
4. Write the PR body to a temporary file and create/update with `gh`:
   - create: `gh pr create --base <base> --head <branch> --title <title> --body-file <file>`
   - update existing PR: `gh pr edit <number> --title <title> --body-file <file>`
5. Return only the PR URL plus any important caveat.

## PR body shape

Use exactly these top-level sections unless the repo clearly requires more:

```markdown
## Summary
<very short explanation of what this PR fixes/enables and why>

- <optional key behavior change>
- <optional key behavior change>

## Design
### <area or subsystem>
- `<path/to/file>` — <what changed here and why it matters>
- `<path/to/test_file>` — <coverage or verification added here>

### <area or subsystem>
- `<path/to/file>` — <what changed here and why it matters>

## Validation
<commands run and results>
```

## Writing rules

- Keep **Summary** short: one tight paragraph plus at most 3 bullets.
- Make **Design** longer than Summary, grouped by area, with code locations in backticks so the user can quickly peek.
- Prefer symbols/classes/functions in code-location bullets when they clarify the change.
- Mention important boundaries, recovery paths, compatibility decisions, or tradeoffs.
- Do not dump every changed file; include the files a reviewer should inspect first.
- Keep **Validation** honest. Include exact commands that were run and the result counts/status. If something was not run or is blocked by known existing issues, say so plainly.
- Do not invent test results, CI status, issue links, or reviewer context.

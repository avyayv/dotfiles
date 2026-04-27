---
name: pr-quiz
description: Quiz the user on a pull request until they fully understand it before merging. Use when the user asks to be quizzed on a PR, review a PR for understanding, prepare to merge, or says phrases like "quiz me on this PR", "make sure I understand this PR", "before I merge", or "PR comprehension".
---

Help me fully understand a pull request before I merge it by quizzing me on the actual changes.

First, inspect the PR instead of asking the user to summarize it when possible:
- If given a PR URL or number, use available repo tooling (`gh pr view`, `gh pr diff`, `git fetch`, etc.) to read the title, description, commits, files changed, and diff.
- If the PR is checked out locally, use `git status`, `git branch`, `git diff`, `git diff --stat`, and relevant base-branch comparisons.
- Read changed files and nearby code as needed. Do not rely only on the diff if surrounding context is important.
- If tests, docs, migrations, config, generated files, or lockfiles changed, inspect them enough to understand why.

Build a concise mental model of the PR before quizzing:
- What problem it solves and why.
- User-visible behavior changes.
- Architectural/design choices.
- Data model, API, dependency, security, performance, concurrency, and compatibility implications.
- Test coverage and missing test cases.
- Rollout, migration, monitoring, and rollback concerns.
- Risk areas and likely failure modes.

Quiz protocol:
- Ask one question at a time.
- Start with high-level intent, then move into specific files, edge cases, tests, and operational risks.
- Prefer questions that force causal understanding: "why", "what happens if", "what invariant is preserved", "what would break if".
- Include code-reading questions that reference concrete files, functions, or hunks from the PR.
- After each user answer, evaluate it directly: correct, partially correct, or incorrect.
- Explain the expected answer, filling gaps with evidence from the PR.
- If the user is shaky, ask a follow-up on the same concept before moving on.
- Do not batch questions unless the user explicitly asks for a written quiz.

For each question, include your recommended/expected answer after the user responds, not before. If the user asks for hints, give a small hint first, then the answer only if needed.

Continue until the user demonstrates understanding of:
1. The PR's purpose and scope.
2. The most important implementation paths.
3. The tests and what they prove or miss.
4. Edge cases and failure modes.
5. Merge/deploy risks and rollback plan.

At the end, give a merge-readiness summary:
- Confidence level.
- Concepts the user understands well.
- Remaining gaps, if any.
- Suggested pre-merge actions, such as tests to run, comments to leave, or changes to request.

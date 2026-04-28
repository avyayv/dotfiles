---
name: remove-slop
description: Use when the user asks to find or remove code slop, dead functions, duplicate/repeated functions, unnecessary PR churn, or repo-wide cleanup candidates. Supports PR-specific and repo-wide modes.
---

# Remove Slop

Find code that should not survive: dead functions, repeated implementations, temporary glue, unused exports, duplicated tests, and changes that cancel each other out. Treat migration churn as PR-specific slop only; historical migrations in an existing repo are usually part of the deployed record and should not be casually deleted.

Start by determining the mode:

- **PR-specific mode**: use when the user says "this PR", gives a PR URL/number, is on a feature branch, asks for review before merge, or does not specify repo-wide scope.
- **Repo-wide mode**: use when the user says "repo-wide", "scan everything", "whole repo", "cleanup backlog", or explicitly asks not to limit the search to a diff.

If the mode is ambiguous, ask one short clarifying question. Otherwise proceed.

## PR-specific mode

Inspect only the PR's effective change, but read surrounding code as needed to judge whether the change duplicates or cancels existing behavior.

First establish the base and diff:

- If given a PR URL or number, use `gh pr view`, `gh pr diff`, and `gh pr checkout`/`git fetch` when available.
- If working locally, use `git status`, `git branch`, `git merge-base`, `git diff --stat <base>...HEAD`, and `git diff <base>...HEAD`.
- Identify created, modified, renamed, deleted, generated, migration, test, dependency, and config files separately.

Look specifically for PR-local slop:

- Two changes that undo each other, such as two Alembic migrations where one creates a column/table/index and a later one drops or renames it back.
- A newly added function, component, query, script, type, constant, or helper that already exists elsewhere under a different name.
- New code that is only used by tests or is not reached from production call sites.
- A new wrapper that only forwards arguments without adding policy, validation, logging, typing, or a stable abstraction boundary.
- A compatibility shim or fallback path that is unnecessary for the versions/configurations this PR supports.
- Duplicated tests that assert the same behavior through different names or fixtures.
- Dead branches introduced by the PR because feature flags, enum values, config keys, or environment checks make them unreachable.
- Migrations that churn schema names, constraints, indexes, defaults, or data back and forth instead of representing the final intended state.
- Added dependencies that duplicate standard library or existing package capabilities.

For every suspicious addition, search the repository for equivalent behavior, not just identical names. Use text search, symbol search, tests, imports, and call sites. Compare semantics before calling something duplicate.

## Repo-wide mode

Scan the whole repository, not only the current diff. Do not restrict findings to recently changed files.

Build an inventory before judging:

- Detect languages/frameworks and their symbol/import tooling.
- List likely source roots, test roots, generated-code directories, scripts, and package/workspace boundaries. Note migration directories only so they can be excluded from deletion-style recommendations unless the user explicitly asks for migration analysis.
- Exclude vendored dependencies, lockfiles, generated artifacts, build outputs, caches, and minified bundles unless the user asks otherwise.

Look for repo-wide slop:

- Functions/classes/modules with no inbound references, no exports used outside their file, and no dynamic registration path.
- Duplicate implementations of the same behavior across packages, services, commands, or tests.
- Old one-off data-fix or maintenance scripts that are still runnable but no longer referenced. Do not treat committed historical schema migrations this way by default.
- Obsolete feature-flag branches, config paths, enum cases, environment-specific code, and compatibility layers.
- Multiple helpers that normalize, validate, parse, serialize, retry, paginate, authorize, or format the same thing.
- Tests, fixtures, factories, mocks, and snapshots that duplicate coverage without increasing confidence.
- CLI scripts, cron jobs, jobs, or workers not referenced by manifests, deployment config, package scripts, docs, or scheduler definitions.
- Dependencies that are unused or whose usage can be replaced by existing internal utilities.

Use conservative evidence. Dynamic languages, plugin systems, reflection, framework conventions, and public APIs can make code appear unused when it is not. Mark uncertain cases as "needs owner confirmation" instead of recommending deletion outright.

Do **not** recommend deleting existing historical migrations in repo-wide mode merely because they are old, superseded by current schema state, or appear unused. Migration cleanup/collapse is only a PR-specific recommendation when the churn is introduced by the unmerged diff and can still be rewritten safely.

## Recommended investigation commands

Prefer project-native tooling when available, then fall back to generic searches:

- Git: `git status`, `git branch --show-current`, `git merge-base`, `git diff --name-status`, `git diff --stat`, `git log --follow`.
- Search: `rg`, `fd`/`find`, language-aware grep, import/reference search, `git grep`.
- Python: `ruff`, `vulture`, `pyright`, `mypy`, `pytest --collect-only`, import graph tools, Alembic history/current/heads when configured.
- TypeScript/JavaScript: `tsc --noEmit`, `eslint`, `knip`, `ts-prune`, `depcheck`, package manager workspace commands.
- Go: `go test ./...`, `go vet`, `staticcheck`, `deadcode`/`unused` analyzers.
- Rust: `cargo check`, `cargo test`, `cargo clippy`, `cargo udeps` if installed.

Do not install new tools without asking. If a useful tool is absent, say what it would check and continue with available evidence.

## Output format

Return findings in priority order. For each finding include:

1. **Verdict**: `delete`, `merge with existing`, `collapse migration churn` (PR-specific only), `replace with existing utility`, `keep`, or `needs confirmation`.
2. **Location(s)**: file paths and symbol names.
3. **Evidence**: references, imports/call sites, diff hunks, migration sequence, or behavior comparison.
4. **Why it is slop**: the concrete redundancy/deadness/cancellation.
5. **Safe action**: exact removal/refactor plan and tests/checks to run.
6. **Confidence**: high/medium/low.

If nothing meaningful is found, say so and summarize what was checked. Do not invent slop just to produce findings.

When asked to actually remove code, make the smallest safe edits, run targeted tests/checks when possible, and report any checks that could not be run.

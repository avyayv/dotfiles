---
name: golang-skill
description: Use when writing, reviewing, testing, debugging, profiling, securing, instrumenting, or maintaining Go code. Routes to focused references for tests, concurrency, context, database access, CLI/Cobra, errors, linting, security, performance, benchmarking, observability, dependencies, structs/interfaces, project layout, and troubleshooting.
---

# Golang Skill

A router for Go work. Load only the reference files needed for the task; do not preload every Go topic.

## Workflow

1. Identify the kind of Go work: implementation, review, test, bug, performance, CLI, database, security, etc.
2. Load the smallest matching `references/<topic>/overview.md` file(s).
3. If that overview points to deeper files, load only the specific deeper files relevant to the current task.
4. Apply the project's existing style and tooling first; use the references for Go-specific judgment.
5. Validate with targeted commands when editing code: usually `gofmt`, `go test ./...`, and relevant linters/benchmarks for the touched area.

When a topic overview or reference links to a relative path such as `references/foo.md`, resolve it relative to that topic directory. Example: from `references/testing/overview.md`, `references/helpers.md` means `references/testing/references/helpers.md`.

## Routing Table

| Task or signal | Load first |
|---|---|
| Writing/reviewing ordinary Go code, naming, comments, formatting, idioms | `references/code-style/overview.md` |
| Test design, table-driven tests, mocks, coverage, fuzzing, fixtures, CI tests | `references/testing/overview.md` |
| Bugs, crashes, deadlocks, unexpected behavior, race debugging | `references/troubleshooting/overview.md` |
| Goroutines, channels, select, locks, errgroup, worker pools, pipelines, leaks/races | `references/concurrency/overview.md` |
| `context.Context`, cancellation, deadlines, request propagation, context values/tracing | `references/context/overview.md` |
| Error creation/wrapping, `errors.Is/As`, sentinels, panic/recover, structured error logging | `references/error-handling/overview.md` |
| SQL/database access: `database/sql`, `sqlx`, `pgx`, transactions, scanning, NULLs, pools | `references/database/overview.md` |
| CLI architecture, flags, config layering, I/O, exit codes, signals, shell completion | `references/cli/overview.md` |
| Cobra command trees, `cobra.Command`, args validators, completions, Cobra tests/docs | `references/spf13-cobra/overview.md` plus `references/cli/overview.md` when architecture matters |
| Struct/interface design, embedding, composition, field tags, receivers, dependency injection | `references/structs-interfaces/overview.md` |
| `go.mod`, adding/upgrading/removing deps, MVS, vulnerabilities, Renovate/Dependabot, workspaces | `references/dependency-management/overview.md` |
| `golangci-lint`, `go vet`, Staticcheck, suppressions, `.golangci.yml` | `references/lint/overview.md` |
| Security review or risky code: injection, crypto, filesystem, network, cookies, secrets, auth | `references/security/overview.md` |
| Benchmarks, pprof, trace, benchstat, measuring regressions, interpreting runtime metrics | `references/benchmark/overview.md` |
| Optimizing after a bottleneck is identified: allocations, CPU, memory layout, GC, pools, caching | `references/performance/overview.md` |
| Production observability: slog, Prometheus metrics, OpenTelemetry tracing, profiling, alerts, dashboards | `references/observability/overview.md` |
| Starting/restructuring a Go project, monorepos, package layout, config/testing layout | `references/project-layout/overview.md` |

## Common Combinations

- CLI using Cobra: load `spf13-cobra`, and load `cli` for broader CLI behavior.
- Database tests: load `database`, then `testing` only for general Go test patterns.
- Concurrency bug: load `troubleshooting`, then `concurrency` for the fix.
- Performance investigation: load `benchmark` for measurement first; load `performance` only after a bottleneck is known.
- Production instrumentation: load `observability`; use `benchmark` only for temporary profiling/deep dives.
- Security-sensitive database/file/network code: load `security` plus the domain-specific topic.

## Reference Index

Each former standalone Go skill now lives under `references/`:

- `references/benchmark/overview.md`
- `references/cli/overview.md`
- `references/code-style/overview.md`
- `references/concurrency/overview.md`
- `references/context/overview.md`
- `references/database/overview.md`
- `references/dependency-management/overview.md`
- `references/error-handling/overview.md`
- `references/lint/overview.md`
- `references/observability/overview.md`
- `references/performance/overview.md`
- `references/project-layout/overview.md`
- `references/security/overview.md`
- `references/spf13-cobra/overview.md`
- `references/structs-interfaces/overview.md`
- `references/testing/overview.md`
- `references/troubleshooting/overview.md`

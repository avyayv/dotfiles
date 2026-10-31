---
name: public-readme
description: Generate public-facing READMEs for open-source projects. Uses patterns from highly-starred GitHub repositories but requires every claim to be verified against the actual codebase. Use when the user asks to create or improve a public README.
---

# Public README Skill

## Before you write: verify everything

A README that makes false, unverifiable, or exaggerated claims is worse than no README at all. Every technical assertion in the output must be checked against the actual repository before you commit it.

**Required fact-checks before drafting:**

1. **Install commands.** Does the command actually work? Is the package published on npm/PyPI/Homebrew/apt/etc? Read the install script, package.json, pyproject.toml — does the documented install path exist? Remove unverified package manager commands. If nothing is published, say "clone and build from source" or use the curl pipe from the repo's own install.sh (and note it copies source into `~/.local`).

2. **License claims.** Does the repo root have a LICENSE file? Are subpackage licenses different? Do not claim MIT, Apache-2.0, or any badge without reading the license and confirming it covers the whole repo or noting package-specific exceptions. If there is no license file at all, do not include a license section.

3. **Badge URLs.** Every badge URL points at a real resource. `npm/v/nonexistent-package` or `github/license/no-license-file` returns a broken 404 image. Verify by checking npm/github/sonar/CI status or don't include the badge at all. A badge level that cannot be verified is cargo-cult decoration, not documentation.

4. **CLI flags and commands.** Every example command and flag must match the actual CLI's help output. Read the CLI source, the CLI's `--help`, or the docs. If you cannot run the binary, do not enumerate options you have not verified.

5. **Feature claims.** Do not say the tool "turns your own merged PRs into benchmark tasks" if the process is manual with no `import-pr` command. Do not say the tool "launches agents from Telegram" without explaining the orchestrator dependency. Every capability the README advertises must be something a user can actually do after reading it — not an aspirational feature or a hand-waved Pipeline That Is Too Complicated To Show.

6. **Public/private boundary.** If the repository contains private paths alongside mirror-published ones, note each directory's visibility state accurately. Do not include internal-only details (service paths, private terraform, secret names) in an OSS README.

## Patterns from benchmark repositories (10 benchmarked, details in references/benchmark-notes.md)

The benchmark repos (Lazygit 81k⭐, fzf 82k⭐, uv 88k⭐, ripgrep 67k⭐, bat 60k⭐, starship 59k⭐, act 71k⭐, GitHub CLI 45k⭐, gum 24k⭐, Codex CLI 102k⭐) share a progressive disclosure structure, not a fixed template. Length follows the product. Some are two paragraphs; some are a book.

### Progressive disclosure order

1. **Identity + one-sentence pitch.** The first text a visitor sees must pass the "tell a friend" test. Not "A CLI tool for..." — "ripgrep recursively searches directories for a regex pattern while respecting your gitignore."

2. **Quick start that actually works.** The reader should be able to copy-paste one install command, one use command, and see a meaningful result. **If the quick start requires a placeholder ID (`agt_123`), a placeholder repo (`~/code/example-project`), or infrastructure setup the reader doesn't have, do not present it as a quick start.** Either use a real path (a known example that ships with the repo) or be honest: "Create a task directory manually (documented below)." A quickstart that cannot be run is worse than no quickstart.

3. **Key features with concrete examples.** Each feature is a small code block or one paragraph. Lazygit gives every feature a GIF. Bat shows screenshots. Gum builds a complete tutorial script. The goal is "I see what this does" — not "I see what the author is proud of."

4. **Installation (verified).** List only the installation methods that actually exist and are tested. Prefer the most common for the audience (brew, cargo, npm, pip). Use `<details>` for long lists only when 6+ methods exist and are verified from official channels. Remove community packages unless upstream or the community maintains them. Starship's model: prerequisites, install, then shell activation.

5. **Usage / workflows.** Group by real task, not by flag. fzf organizes by scenario: "Files and directories" / "Process IDs" / "Host names" — each is one or two code blocks and a caption. If the tool integrates with other tools (bat/fzf, fzf/vim, gum/shell scripts), those are their own section.

6. **Configuration (when applicable).** Show the config format, environment variables, and one example per key capability.

7. **Contributing.** Brief link to CONTRIBUTING.md or project-specific setup steps for new contributors. Include local dev commands if they are short.

8. **FAQ or tradeoffs.** For complex tools. Ripgrep's "Why shouldn't I use ripgrep?" and bat's troubleshooting signal honesty and help the right audience self-select.

9. **License.** One line, verified from the actual LICENSE file. If no file exists, admit it.

### Stylistic rules

- **No internal implementation details.** The reader cannot see your code. Do not describe module structure, internal services, or private architectural layering unless the user explicitly asks for internals.
- **Code blocks before concepts.** A code block beats a paragraph for communicating behavior.
- **Installation near the top** for tools users must try. For libraries or platforms, it may sit further down.
- **Progressive disclosure.** Everything above the first scroll (the "fold" in practice) must answer "what is this" and "can I try it now." Details go below.
- **Voice is allowed.** Lazygit's rant elevator pitch works for its audience. Not every project needs that, and a flat "paragraphs of explanation" voice is worse than no voice at all. But the bar for personality is that it must also be informative.

## Pitfalls discovered during construction

These come from first-reader reviews of three draft READMEs. Incorporate them into every generated README.

### Orchestrator / hidden dependency problem

When the quickstart says "send a message to Telegram and it launches an agent," a first-time reader assumes that works out of the box. If there is a required orchestrator component that must be separately configured and authenticated, the README must either:
- Show how to configure it, or
- Make the quickstart work without it, or
- Clearly label the workflow as "advanced setup."

**Do not imply remote control capability without explaining how messages reach a CLI.**

### "First real step" gap

After the quickstart, the reader must know what to do next that is not a placeholder. If the main workflow is "create a task directory manually" (no `import-pr` command exists), say that. If the only way to get an agent ID is to deploy first, show the deploy output and say "the agent_id appears in the response."

A README that says "turn your PRs into benchmark tasks" but never shows a `create` command is not just incomplete — it is misleading.

### "Publish it once" / non-gradual promises

If the product supports multiple versions and deploys, "publish once" and "stable endpoint" are technically consistent but produce an expectation of zero ongoing publishing. Be precise: version pinning vs. appending new versions.

### Quickstart that is not runnable

Every command in a quickstart section must work when the reader copies it and inserts their own values for obvious placeholders (their own repo path, their own API key from a real keys page). If the quickstart uses `agt_123` without explaining where `agt_` IDs come from, the reader is stuck.

### Durable/state semantics

Words like "durable," "persistent," "keeps running" have multiple meanings. Specify: persisted to disk? runs continuously in a sandbox? resumable after process restart? retained for N days? A concrete example (the same session_id stays addressable across N turns) communicates more than "durable."

## Process

When the user asks for a public README:

1. **Read the repo.** Root files, install script, package.json/pyproject.toml, existing README, CLI source entry points, AGENTS.md, CI workflows, license files.
2. **Verify the install path.** Can the user `npm install -g this`? `cargo install`? `curl ... | bash`? If nothing is published, what is the actual install command?
3. **License provenance.** Read the file if it exists. Note which subpackages have which license.
4. **Check quickstart runnability.** Every command in the quickstart section must be something a user can actually execute against the real product.
5. **Draft** following the progressive disclosure order and avoiding the pitfalls above.
6. **Run the comprehension check** (required).
7. **Update repo fact-checks.** Did the comprehension check find bad facts? Fix them in the README before committing.
8. **Iterate** based on comprehension check findings.

### Comprehension check with caveats (required after every draft)

After writing or substantially editing the README, you **must** launch a subagent to sanity-check it as a first-time reader. Use `pi -p` (non-interactive mode) with `--no-tools --no-skills --no-extensions --no-prompt-templates --no-context-files` so the reviewer sees only the README text, not repo context.

**Important caveat:** The reviewer sees only the single README file, not any linked documentation, CLI --help output, or repository source code. A term being undefined in the README is not automatically a defect if:
- The term has a straightforward meaning for the project's target audience ("coding agent", "API key", "benchmark task", "repository clone"), or
- The README clearly links to definitions in deeper docs (`docs/`, `skill/`, external URLs), and
- The README provides enough context for the target user to follow the quick start path.

Evaluate the reviewer's flagged terms against these criteria before adding inline definitions. Do not expand the README past readability just to satisfy a reviewer that could not access the linked documentation.

The subagent prompt:

```
You are reviewing documentation as a first-time reader. You have no prior context about this project. Below is the full documentation — read it and answer:

1. What is this? (one sentence)
2. What problem does it solve?
3. If you had to use it right now, what would you do first?
4. What is unclear, ambiguous, or assumes knowledge you don't have?
5. Are there any terms or concepts used without being defined?

Be specific about confusion — point to exact phrases. Do not be polite; if something is unclear, say so.

--- BEGIN DOCS ---
<full README text>
--- END DOCS ---
```

Report the subagent's findings verbatim to the user, then propose fixes for comprehension gaps.

## When the project has an existing README

Read and understand what the existing README does well. Preserve accurate usage details, validated API references, and correct installation commands. The goal is structural and stylistic improvement — not rewriting accurate content for cosmetics.

Do not delete or obscure an important limitation or installation caveat that the existing README honestly documents.

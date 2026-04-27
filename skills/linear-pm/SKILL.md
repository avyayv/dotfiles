---
name: linear-pm
description: Act as a product manager when filing Linear issues. Use when the user asks to "file issues in Linear", "add these to Linear", "create tickets for X/Y/Z", or hands over a bulleted list of ideas to triage into the backlog.
---

# Linear Product Manager

Turn a rough list of ideas into well-structured Linear issues. A good PM interrogates each idea until scope and motivation are crisp, then writes a **short, flat** issue a stranger could pick up. Vague issues pollute the backlog — so do bloated ones.

## Keep issues short

Default shape is three sections and nothing else:

```markdown
<one- or two-sentence summary of what this is>

## Scope
- what's in

## Motivation / Why
<1–3 sentences on what's driving it>
```

No "Open questions" section, no "Out of scope" section, no "Relationship to other work" section by default. Strip every section that isn't load-bearing. If the summary and Scope already answer a question, don't repeat it under another heading. A one-paragraph issue is often the right shape.

If you genuinely need to call out a deferred decision, one line inline in Scope (`— defer X to later`) beats a new section.

## No mega-issues, no parent/child hierarchy

**File the leaves directly.** Don't create umbrella / epic / "primitives model" / "X system" issues that only exist to group other issues. The Linear backlog view renders flat, so parent + children show as peer rows with breadcrumb noise — worse than no hierarchy at all.

- No `parentId` / no sub-issues.
- No `blocks` / `blockedBy` relations.
- No `relatedTo` cross-links.

If two issues genuinely touch, reference by DAR-number **in the description body** of whichever issue needs the pointer. Inline text references don't create relation rows and don't clutter the list view.

When a user says "there's a big X initiative, file issues for it" — file the concrete sub-tasks as flat issues. Don't also file the umbrella.

## Workflow

**1. Gather workspace context first.** Before asking the user anything, list teams, projects, and labels so you can target issues correctly:

- `mcp__linear-server__list_teams`
- `mcp__linear-server__list_projects`
- `mcp__linear-server__list_issue_labels`

**2. Go one issue at a time.** Do not batch questions across multiple issues — the user loses track of which answer belongs to which idea. Say which issue you're working on, ask its questions, confirm you have what you need, move on.

**3. Ask 2–4 clarifying questions per issue via `AskUserQuestion`.** Provide concrete multiple-choice options, not open-ended prompts. Include a "leave open" option whenever forcing a decision now would be premature.

**4. File the issues in parallel at the end.** After the last interview, create all issues in a single batch with parallel `mcp__linear-server__save_issue` calls.

## What to ask

For each issue, probe until you can answer: **what exactly, why now, what's explicitly not happening.** Pick the 2–4 questions that are actually unclear — skip the rest:

- **Scope** — what's the shape of the change.
- **Motivation / why** — what's driving it (customer ask, tech debt, positioning, incident).
- **Priority** — always ask. Urgent / High / Normal / Low maps to Linear `priority` 1 / 2 / 3 / 4.
- **What's out** — specifically *not* in v1, so scope doesn't creep.

Do **not** ask about relationships between issues — they stay flat.

## What NOT to ask

**Don't ask about things derivable from the codebase or architecture.** If the project is on Temporal, don't ask "how does the wait work" — it's a signal. If it's a sandbox platform, don't ask "does the agent run in a container" — it does. Read `CLAUDE.md`, skim the code, or check recent commits for mechanism questions before bothering the user.

**Don't ask about implementation details.** Transport mechanisms, library choices, exact file paths — those belong in design docs, not PM intake.

**Don't ask permission to proceed.** After you've gathered answers, write and file. No "want me to file it now?"

## Priority, labels, targeting

- Linear `priority` field: `0` = None, `1` = Urgent, `2` = High, `3` = Medium/Normal, `4` = Low. Always set priority explicitly — `0` means the issue won't surface in triage views.
- Use existing labels; don't invent new ones without asking.
- If the workspace has one active project, default to it. If multiple, ask once at the start.
- Don't set an assignee unless the user explicitly says so.

## When the user pushes back

If the user corrects you ("too long", "that's obvious", "we already decided"), drop the line of questioning, acknowledge briefly, and reformulate. Don't re-ask the same thing with different wording. Save the correction as a `feedback` memory if it looks like it'll apply to future sessions.

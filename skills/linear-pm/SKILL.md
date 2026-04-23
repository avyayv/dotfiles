---
name: linear-pm
description: Act as a product manager when filing Linear issues. Use when the user asks to "file issues in Linear", "add these to Linear", "create tickets for X/Y/Z", or hands over a bulleted list of ideas to triage into the backlog.
---

# Linear Product Manager

Turn a rough list of ideas into well-structured Linear issues. A good PM interrogates each idea until scope, motivation, and priority are crisp, then writes an issue a stranger could pick up. Vague issues pollute the backlog — don't file them.

## Workflow

**1. Gather workspace context first.** Before asking the user anything, list teams, projects, and labels so you can target issues correctly:

- `mcp__linear-server__list_teams`
- `mcp__linear-server__list_projects`
- `mcp__linear-server__list_issue_labels`

**2. Go one issue at a time.** Do not batch questions across multiple issues — the user loses track of which answer belongs to which idea. Say which issue you're working on, ask its questions, confirm you have what you need, move on.

**3. Ask 2–4 clarifying questions per issue via `AskUserQuestion`.** Provide concrete multiple-choice options, not open-ended prompts — it's faster. Include a "leave open" / "not decided" option whenever forcing a decision now would be premature.

**4. File the issues in parallel at the end.** After the last interview, create all issues in a single batch with parallel `mcp__linear-server__save_issue` calls.

## What to ask

For each issue, probe until you can answer: **what exactly, why now, how big, what's out of scope, where does it plug in.** Pick the 2–4 questions from this list that are actually unclear — skip the rest:

- **Scope / model** — what's the shape of the change. E.g., "Is this a new backend alongside the existing one, or a replacement?"
- **Motivation / why** — what's driving it (customer ask, tech debt, positioning, incident). This lands in the issue body.
- **Priority** — always ask. Urgent / High / Normal / Low maps to Linear `priority` 1 / 2 / 3 / 4.
- **Relationships** — does it block, or is it blocked by, other issues in this batch or in the existing backlog.
- **Out of scope** — what's explicitly *not* happening in v1, so scope doesn't creep later.

## What NOT to ask

**Don't ask about things derivable from the codebase or architecture.** If the project is on Temporal, don't ask "how does the wait work" — it's a signal. If it's a sandbox platform, don't ask "does the agent run in a container" — it does. Read `CLAUDE.md`, skim the code, or check recent commits for mechanism questions before bothering the user. Users push back hard on obvious questions, and rightly so.

**Don't ask about implementation details.** Transport mechanisms, library choices, exact file paths — those belong in design docs, not PM intake. If the issue body needs them, list them under "Open questions" and let the implementer decide.

**Don't ask permission to proceed.** After you've gathered answers, write and file the issue. No "want me to file it now?"

## Issue body structure

Use this shape, omitting sections that don't apply. A small issue gets a two-sentence summary and a "Why" line — don't force structure onto something simple.

```markdown
<one-paragraph summary of what and why>

## Scope
- what's in

## Motivation / Why
<1–3 sentences on what's driving it — the reason for filing, not a restatement of the title>

## Open questions
- decisions the implementer will need to make

## Out of scope
- what's explicitly deferred

## Relationship to other work
- links to related / blocking issues
```

## Priority, labels, targeting

- Linear `priority` field: `0` = None, `1` = Urgent, `2` = High, `3` = Medium/Normal, `4` = Low. Always set priority explicitly — `0` means the issue won't surface in triage views.
- Use existing labels; don't invent new ones without asking.
- If the workspace has one active project, default to it. If multiple, ask once at the start.
- Don't set an assignee unless the user explicitly says so.

## When the user pushes back

If the user corrects you ("that's obvious from the architecture", "we already decided that"), drop the line of questioning, acknowledge briefly, and reformulate. Don't re-ask the same thing with different wording. Save the correction as a `feedback` memory if it looks like it'll apply to future sessions.

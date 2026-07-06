---
name: correction-capture
description: Capture Avyay's corrections when he says no, actually, wrong framing, don't do that, that's slop, not what I meant, or gives repeated taste/process feedback. Use to convert corrections into durable AGENTS.md, skill, prompt, or workflow improvements.
---

# Correction Capture

Use this skill when Avyay corrects an agent's behavior, framing, implementation style, validation, UX taste, or process.

The goal is to turn repeated corrections into persistent instructions so Avyay does not have to keep reteaching the same thing.

## Triggers

Use when Avyay says or implies:

- `no`, `actually`, `wait`, `not what I meant`, `wrong framing`, `why did you`, `don't do that`, `that's slop`, `delete this`, `stop`, `should have`, `we don't care about backwards compat`, or similar.
- A correction reveals a product, architecture, validation, or style preference.
- The same preference has appeared before in the current conversation or traces.

Do not interrupt urgent operational work just to meta-discuss the correction. Capture it briefly and apply it after the immediate issue is stable.

## Process

1. Identify the correction in concrete terms.
2. Classify it:
   - One-off task preference.
   - Repo/process rule.
   - Global agent behavior rule.
   - Skill-specific rule.
   - Product/UX taste rule.
3. Decide whether it should become persistent.
4. If persistence is useful, propose the exact destination:
   - Repo `AGENTS.md` for repo-specific engineering/process rules.
   - `/Users/avyay/.pi/agent/AGENTS.md` for global agent rules.
   - A specific skill under `/Users/avyay/.pi/agent/skills/` for workflow-specific behavior.
   - A project doc if it is durable product/architecture knowledge.
5. Ask for confirmation before editing persistent instruction files unless Avyay clearly asked to update the rule.
6. If confirmed, make the smallest precise edit and mention the file changed.

## Output Format

Use this concise structure when surfacing the capture:

```md
Correction captured: <one sentence>
Type: <one-off | repo rule | global rule | skill rule | product/UX taste>
Suggested persistence: <file or none>
Proposed wording: <exact rule text>
```

## Rules

- Do not overgeneralize from a single angry correction.
- Do not add broad rules that would block reasonable future pivots.
- Prefer specific positive invariants over long lists of negative examples.
- Preserve Avyay's actual intent, not the agent's defensive interpretation.
- If the correction is about current code, fix or report the current issue first, then capture the durable lesson.
- Keep persistent wording short, direct, and operational.

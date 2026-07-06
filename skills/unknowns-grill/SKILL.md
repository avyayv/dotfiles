---
name: unknowns-grill
description: Use before nontrivial implementation, architecture, product, data-shape, workflow, or UI work to uncover unknowns, sharpen intent, and define stop-and-ask conditions before coding. Also use when Avyay says /grill, asks to grill a plan, asks for a blindspot pass, gives a vague/rough task, or starts work in an unfamiliar/high-risk area.
---

# Unknowns Grill

Do not implement code during the grill unless Avyay explicitly says to proceed.

## Process

1. Read the relevant repo docs, existing code, plans, specs, traces, or artifacts needed to understand the territory.
2. Restate the task in concrete terms.
3. Identify unknowns:
   - Known Knowns: what Avyay explicitly said.
   - Known Unknowns: choices Avyay seems aware of.
   - Unknown Knowns: likely taste/product assumptions Avyay may recognize only when stated.
   - Unknown Unknowns: hidden codebase, architecture, data, deployment, UX, or validation risks.
4. Identify decisions where Avyay's answer would change the architecture, data model, UX, or implementation strategy.
5. Ask only the highest-leverage questions. Prefer 3-7 questions. If the situation is very ambiguous, ask one question at a time.
6. Define default conservative assumptions if Avyay does not answer.
7. Define stop-and-ask conditions for the later implementation.
8. Define validation / acceptance criteria.

## Output Format

Use this exact structure:

```md
## Current Understanding
## Territory Read
## Blindspots / Unknown Unknowns
## Architecture-Changing Decisions
## Questions For Avyay
## Default Assumptions
## Stop-And-Ask Conditions
## Acceptance Criteria
## Suggested Implementation Notes Path
```

Implementation notes should live outside the repo by default:

```text
/Users/avyay/.relaymux/implementation-notes/<repo>/<branch-or-task>.md
```

## Rules

- Be blunt and specific.
- Do not ask low-impact questions.
- Do not turn obvious implementation mechanics into questions.
- Prefer codebase-specific concerns over generic best practices.
- Separate product/framing uncertainty from mechanical coding uncertainty.
- If the task is clearly underspecified, say so before planning.
- If the path is obvious, say what assumptions make it obvious and proceed only after Avyay confirms.

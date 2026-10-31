---
name: post-change-explainer-quiz
description: Teach Avyay what changed after a substantial or confusing implementation, PR, merge, refactor, or debugging session through an interactive code-backed 1:1 tutoring session, then quiz him at the end. Use when Avyay asks to understand what changed, asks for an explainer, asks for a quiz, wants confidence before merging, or invokes post-change-explainer-quiz.
---

# Post-Change Explainer Quiz

Use this skill after meaningful changes when Avyay needs to understand the behavior before trusting or merging it.

This is a teaching/review workflow, not an implementation step. Do not edit code unless Avyay separately asks for fixes.

The default output is an interactive tutoring session in chat, not a file. Write a report file only when Avyay explicitly asks for an artifact, report, browser-readable page, handoff doc, or saved explainer.

## Inputs To Inspect

Read the relevant sources before writing the explainer:

- Git diff against the intended base branch.
- PR body, comments, and checks when a PR exists.
- Implementation journal under `/Users/avyay/.context-drop/managed/state/implementation-notes/` when present.
- Relevant tests, docs, migrations, API contracts, UI routes, scripts, or run artifacts.
- Any validation output already produced by agents or CI.

## Default Teaching Flow

After inspecting evidence, teach in short interactive passes:

1. Start with a compact map of the change: the old mental model, the new mental model, and the 2-4 code paths that matter most.
2. Teach one concept at a time. For each concept:
   - Point to specific files and line numbers when available.
   - Explain the runtime behavior or contract, not just the diff.
   - Show how data/control flows through the relevant code path.
   - Ask 1-2 checkpoint questions before moving on.
3. Wait for Avyay's answer after checkpoint questions when the question is substantive. Do not immediately dump the full answer key.
4. Adapt the next explanation to his answer: correct misunderstandings directly, skip what he clearly understands, and go deeper where he hesitates.
5. After the main concepts are covered, run a final quiz.

Use a 1:1 tutoring tone: direct, concrete, and code-backed. Avoid long monologues. Prefer 3-7 minute chunks over one complete essay.

## Checkpoint Question Rules

- Ask questions that prove understanding of behavior, contracts, failure modes, and validation.
- Make questions answerable from the code you just pointed at.
- Use questions like "What happens if...", "Which file is the source of truth for...", "Why does this not...", and "What would break if...".
- Do not ask trivia about filenames unless the filename is itself the contract.
- If Avyay answers incorrectly, explain the correction using the relevant code path before continuing.
- If Avyay says he just wants the quiz or asks not to pause, skip intermediate pauses and give the quiz.

## Final Quiz Rules

- Ask 5-10 questions for substantial changes; 3-5 for smaller ones.
- Focus on behavior, contracts, failure modes, and validation, not trivia.
- Include at least one question about remaining risk or an unvalidated path.
- Do not reveal the answer key in chat until Avyay answers, unless he explicitly asks for the answers.
- Questions should prove understanding of how the system now behaves, not just what files changed.

## Optional Report Location

If Avyay explicitly asks for a saved artifact, use this default report path:

```text
/Users/avyay/.context-drop/managed/reports/<repo>-post-change-explainer-<YYYYMMDD>-<short-task>.md
```

If Avyay asks for a browser artifact or phone-readable artifact, render or serve it and provide a tailnet URL according to global instructions.

## Optional Report Structure

When a saved report is requested, use this structure:

```md
# <Change / PR Name> Explainer

## TL;DR

## What Changed

## Why It Changed

## Key Files And Code Paths

## Behavior Before vs After

## Data / API / UX / Deployment Impact

## Validation Performed

## Risks And Open Questions

## What To Review Before Merge

## Quiz

## Answer Key
```

If writing a file, include the answer key at the bottom so it is available in the artifact. In chat, keep the answer key hidden until Avyay answers or asks for it.

## Explanation Rules

- Be concrete and code-path-specific.
- Prefer teaching the mental model before listing file changes.
- Avoid generic PR summary fluff and long report-style dumps unless a file report was requested.
- Call out skipped or weak validation honestly.
- Highlight contract, migration, compatibility, security, or deployment implications before mechanical refactors.
- If the change is too risky to explain confidently from the available evidence, say what evidence is missing.
- When pointing at code, use clickable file links when possible.

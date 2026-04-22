---
name: public-docs
description: Write public-facing documentation that a fresh reader can actually follow. Use when the user asks for external/public docs, README content, API reference, user guides, or any documentation that will ship to an outside audience.
---

# Public Documentation Writing

Public docs are read by people who don't work in the codebase. Optimize for a reader with zero context.

## Writing rules

**Prose over lists.** Default to paragraphs. Lists are for genuinely enumerable things (supported options, ordered install steps) — not for pacing prose or breaking up ideas. If you catch yourself writing three consecutive bulleted sections, rewrite as prose.

**No internal implementation details unless the user explicitly asks.** That means: no internal module paths, no private class names, no references to internal services/workers/queues, no "this is implemented by X calling Y", no repo-specific layering rules, no mentions of how the team is organized. The reader cannot see your code and does not care.

If you are unsure whether something counts as internal, ask the user before including it. Public docs describe *what it does and how to use it*, not *how it's built*.

**Show the shape of usage early.** A working example near the top beats a wall of conceptual prose. Every public API should have a minimal, copy-pasteable snippet.

**Write complete sentences.** Docs aren't notes. "Returns a user." beats "→ user".

## Required verification step

After you finish writing or substantially editing the docs, you **must** launch a subagent to sanity-check comprehension. Use the Agent tool with `subagent_type: "general-purpose"` and pass **only the documentation content** — no surrounding codebase context, no links to files, no hints about what the product does.

The subagent prompt should look like this:

```
You are reviewing documentation as a first-time reader. You have no prior context about this project. Below is the full documentation — read it and answer:

1. What is this? (one sentence)
2. What problem does it solve?
3. If you had to use it right now, what would you do first?
4. What is unclear, ambiguous, or assumes knowledge you don't have?
5. Are there any terms or concepts used without being defined?

Be specific about confusion — point to exact phrases. Do not be polite; if something is unclear, say so.

--- BEGIN DOCS ---
<paste the full doc content here verbatim>
--- END DOCS ---
```

Report the subagent's findings back to the user verbatim, then propose fixes for any comprehension gaps it flagged. Do not skip this step even for small edits — a fresh reader catches what you can't.

## When the user asks for internal details

If the user says something like "include the architecture" or "document the internals," that's the signal to relax the no-implementation-details rule for this task only. Ask which internals they want surfaced if it's ambiguous. Don't assume the exception extends to future docs.

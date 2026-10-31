---
name: dari-benchmark-chart
description: Render Dari benchmark result charts (accuracy vs. cost scatter with a pareto frontier) in the dari.dev landing-page visual style. Use whenever Avyay asks for a benchmark graph/chart/plot of eval results — model accuracy vs. spend, router vs. baseline comparisons, or "a graph like the blog/landing page one".
---

# Dari benchmark chart

Avyay's chosen style for benchmark result charts (picked from a 10-variant bake-off in Aug 2026):
an accuracy-vs-cost scatter in the dari.dev landing-page design system, with a **pareto frontier
line** and the Dari point highlighted in mint. No dominance region, no ochre threshold — the
frontier variant is canonical.

## Fast path

Write a spec JSON (copy `example.json` in this skill directory — it reproduces the canonical
Snowflake data-eng-bench chart) and run:

```bash
python3 ~/.claude/skills/dari-benchmark-chart/make_chart.py spec.json
```

It renders an 1840×1104 PNG via headless Chrome (Google Fonts fetched at render time, so it
needs network). Spec fields: `title`, `subtitle`, `points[]` (`name`, `accuracy` 0–100, `cost`
in dollars, optional `label`, `highlight`, `side`), optional axis overrides (`y_min`, `y_max`,
`y_step`, `x_max`, `x_step`), `frontier` (default true), `theme` ("light" for the light
variant), `out`.

## Style rules (if drawing by hand instead)

The design system is the dari.dev landing page (`agent-host/dari-landing-page/src/styles.css`):

- **Ground** `#09100f`; gridlines `rgba(38,54,49,.6)`, horizontal only.
- **Type**: Manrope 500 with tight tracking (−.045em) for the title and point names; DM Mono
  for the eyebrow, axis ticks/titles, and value lines — uppercase + letterspaced for labels.
  Eyebrow "BENCHMARK" in mint above the title.
- **Points**: baseline runs are `#6f817a` dots (r10, 4px ground-color stroke); the Dari point
  is mint `#8ee6bd` — r8 core + r15 ring + soft glow — with its name in `#b7f4d6`.
- **Pareto frontier**: polyline through the cost-sorted points that raise best-so-far accuracy,
  stroke `rgba(142,230,189,.28)` 2.5px, labeled `PARETO FRONTIER` in small letterspaced mono
  rotated along the longest segment.
- **Labels**: every dot gets a two-line label — name (Manrope 600) over value (`61.2% at $10`,
  DM Mono, muted). Default to the **right** of the dot (Avyay's explicit preference, including
  the rightmost point — extend the x-axis rather than flipping the label to the left).
- **Thinking/reasoning effort**: never bake it into the model name. Use a small faint
  parenthetical after the name — `GPT-5.6-sol (xhigh)` — via the spec's per-point `effort`
  field with `effort_style: "paren"` (the canonical choice; `"value"` and `"line"` also exist).
  This matches Artificial Analysis's convention on their intelligence-vs-cost scatters.
- **Harness**: when every run uses the same harness (e.g. all Pi), name it once in the
  subtitle ("… , Pi agent") — never repeat it on each point.
- Y-axis is accuracy with `%` ticks; x-axis is **cost per task** with `$` ticks (Avyay's
  preference — not total suite cost); axis titles uppercase letterspaced DM Mono
  ("COST PER TASK" / "ACCURACY"). Give per-point `label`s explicitly when costs are
  sub-dollar — the auto-label rounds to whole dollars.

## Honesty rules for the data

- Only plot clean runs: 0 errored trials, frozen dataset, verified model/provider in logs.
  Infrastructure-crashed trials must be resumed before a run is plotted.
- Costs are model API spend at published provider rates. Harbor's `cost_usd` is often wrong
  (its bundled Pi lacks pricing metadata for newer models) — recompute from token counts, and
  sanity-check rates against Dari's recorded provider spend when available.
- Verify thinking level from the run's Pi session logs, not the adapter config. Example trap:
  the FireworksPi adapter registers models with `reasoning: False` and Pi logs
  `thinkingLevel: "off"`, but DeepSeek V4 Flash still returned massive `reasoning_content`
  (thinking ≈20× the response text) — its server-side default. The honest label there is
  `default thinking`, not `no thinking`. Check assistant messages for `"type": "thinking"`
  blocks before labeling a run.

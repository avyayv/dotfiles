---
name: dari-design
description: Design and implement UI that matches Dari's frontend visual language. Use when creating or reviewing React/Tailwind UI for the Dari frontend, designing Dari screens, or making an interface consistent with Dari's dark Geist style, shared with dari.dev (charcoal, mint accent, square panels, rounded controls).
---

# Dari Design

Use this skill for any Dari app UI work.

This skill is intentionally self-contained. Do **not** tell agents to open named Dari frontend files just to learn the design system. Rely on the tokens, primitive contracts, and examples embedded below. Only inspect source files when you are editing that specific code, checking imports/types, or validating behavior.

The app and the landing page (dari.dev) share one look. It replaced the old amber, all-mono, zero-radius style in v1.0.305; if you find that style in old code or old notes, it is the thing to remove, not the thing to match.

## Visual Contract

Dari is a quiet, dark, dense tool UI set in Geist:

- Neutral charcoal page, bright secondary text, hairline rules.
- Mint is the one accent, used sparingly.
- **What sits on the page grid is square; what is pressed or floats is rounded.** Cards, panels, tables, and stat tiles have no radius. Buttons, inputs, chips, segmented controls, menus, tooltips, toasts, and dialogs do.
- Rules and low-opacity fills give structure. Shadows only lift things that float.
- Utility-first Tailwind with design tokens; no one-off CSS for normal UI.

Do not invent a parallel design system. Reuse existing primitives when working in a codebase that has them, and match the embedded primitive contracts below when creating new UI.

## Non-Negotiables

- **Geist for the interface, Geist Mono for the technical.** Mono is for code, commands, IDs, model slugs, keys, and endpoint URLs only. Names, labels, numbers, and prose are sans. JetBrains Mono exists for the `dari.dev` wordmark (`font-wordmark`) and nothing else.
- **Two weights.** `font-normal` is 450 and `font-medium` is 550 (Geist at 400 reads thin in grey on dark at 12–14px). Do not use `font-semibold`, `font-bold`, or `font-light`.
- **No uppercase tracked labels.** Field labels, table headers, and metadata labels are `text-xs text-faint` in Title Case. The one exception is a plan name (Gateway, Autorouting), which keeps the pricing page's `font-mono text-[10px] font-medium uppercase tracking-[0.14em]`.
- **Nothing under 11px**, the plan-name label aside. 11px is for chart ticks and the densest metadata; labels are 12px.
- **Token colors only.** Prefer `bg-background`, `bg-card`, `bg-popover`, `bg-muted/*`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `text-faint`, `border-border`, `border-input`, `text-brand`, `text-warning`, and `destructive` tokens. No hard-coded hex, and no Tailwind palette classes (`amber-*`, `emerald-*`, `blue-*`, `neutral-*`, `bg-white`, `text-black`).
- **Mint means accent or good, never warning.** Use it for focus, selection, the active tab underline, the active nav icon, links on hover, copied/confirmed states, and "good" values. Warnings are `warning` (ochre). Errors are `destructive`.
- **Square on the grid, rounded off it.** Do not round a card, panel, table, or tile. Do not leave a button, input, chip, menu, or dialog square. No pills: `rounded-full` is for avatars, status dots, and meter bars only.
- **A heading stands alone.** A page title carries no description. Helper text for a section, card, or dialog heading goes in a `HelpTooltip` beside the heading, never in a line under it.
- **No ornamental UI.** No emoji, illustrations, gradients, glows, glassmorphism, or playful empty states unless Avyay explicitly asks.

## Embedded Theme Contract

Canonical CSS tokens. Each color is the landing page's hex as an HSL triple so Tailwind's opacity modifiers work.

```css
:root,
.dark {
  color-scheme: dark;

  --background: 240 2.4% 8%;          /* #141415 page */
  --foreground: 0 0% 92.9%;           /* #ededed ink */

  --card: 240 2% 10%;                 /* #19191a cards, dialogs */
  --card-foreground: 0 0% 92.9%;

  --popover: 240 3% 12.9%;            /* #202022 menus, tooltips, toasts */
  --popover-foreground: 0 0% 92.9%;

  --muted: 240 3.3% 11.8%;            /* #1d1d1f */
  --muted-foreground: 240 2.9% 73.3%; /* #b9b9bd secondary text, kept bright */
  --faint: 240 2.8% 51.6%;            /* #808087 labels, table headers, placeholders, units */

  --border: 240 1% 19%;               /* #303031 rules: white at 12% over the page */
  --input: 240 1% 25%;                /* brighter edge for controls */

  --brand: 152 63.8% 72.9%;           /* #8ee6bd mint */
  --ring: var(--brand);

  --warning: 37.8 57.5% 62.2%;        /* #d6ad67 ochre */
  --sage: 120 5.3% 52.4%;             /* #7f8c7f sidebar group headings */

  --primary: 0 0% 92.9%;              /* primary buttons are ink on charcoal */
  --primary-foreground: 240 2.4% 8%;

  --secondary: 240 3.3% 11.8%;
  --secondary-foreground: 0 0% 92.9%;

  --accent: 240 1.4% 13.5%;           /* hover and selected rows: white at 6% */
  --accent-foreground: 0 0% 92.9%;

  --destructive: 358 66% 54%;
  --destructive-foreground: 0 0% 98%;

  /* Chart series, handed out in this order. Add to the end; never reshuffle. */
  --chart-1: #199e70;
  --chart-2: #3987e5;
  --chart-3: #d95926;
  --chart-4: #9085e9;
  --chart-5: #c98500;
  --chart-6: #d55181;
  --chart-7: #008300;
  --chart-8: #1c9cbf;
  --chart-9: #6468de;
  --chart-red: #e66767;               /* errors only, never a series */
}

* {
  border-color: hsl(var(--border));
  scrollbar-color: hsl(var(--foreground) / 0.24) transparent;
  scrollbar-width: thin;
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
  font-weight: 450;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1,
h2 {
  letter-spacing: -0.02em;
}

::selection {
  background: hsl(var(--brand));
  color: hsl(var(--background));
}
```

Fonts are self-hosted from `/fonts/` (`geist.woff2`, `geist-mono.woff2`, both variable 100–900, and `jetbrains-mono-500.woff2`) and preloaded in `index.html`. Do not add a font CDN.

Canonical Tailwind contract:

```ts
const themeContract = {
  fontFamily: {
    sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
    mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
    wordmark: ["JetBrains Mono", "ui-monospace", "monospace"], // dari.dev only
  },
  fontWeight: {
    normal: "450",
    medium: "550",
  },
  colors: {
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
    card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
    popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",
    primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
    secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
    accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
    destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
    brand: "hsl(var(--brand))",
    faint: "hsl(var(--faint))",
    warning: "hsl(var(--warning))",
    sage: "hsl(var(--sage))",
  },
  borderRadius: {
    sm: "4px",      // chips, badges, menu items, checkboxes
    DEFAULT: "6px",
    md: "6px",      // buttons, inputs, segmented controls, notices, tooltips
    lg: "8px",      // dialogs, menus, toasts, code blocks, chart tooltips
  },
};
```

## Type Scale

| Use | Classes |
| --- | --- |
| Page title | `text-xl font-medium` (h1; tracking comes from the base rule) |
| Section heading | `text-base font-medium` |
| Card or dialog title | `text-sm font-medium` or `text-[15px] font-medium tracking-[-0.01em]` |
| Headline number | `text-2xl font-medium tracking-[-0.03em] tabular-nums` (`text-4xl` for a hero figure) |
| Body, controls | `text-sm` |
| Dense body, helper text, small buttons | `text-[13px]` |
| Labels, table headers, metadata | `text-xs text-faint` |
| Chart ticks, densest metadata | `text-[11px]` |

Text color carries hierarchy: `text-foreground` for what matters, `text-muted-foreground` for supporting text, `text-faint` for labels and units. Numbers in columns and tiles take `tabular-nums`.

## Embedded Primitive Contracts

Use these as the style/API contract for common primitives. If an app already has these primitives, import and reuse them instead of duplicating them.

### Button

```tsx
const buttonBase =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

const buttonVariants = {
  default: "bg-primary text-primary-foreground border border-primary hover:bg-primary/90",
  outline: "border border-input bg-transparent text-foreground hover:border-foreground/40 hover:bg-accent",
  ghost: "bg-transparent text-foreground hover:bg-accent",
  destructive:
    "bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive/90",
};

const buttonSizes = {
  default: "h-9 px-4",
  sm: "h-8 px-3 text-[13px]",
  lg: "h-11 px-5 text-[15px]",
  icon: "h-9 w-9",
};
```

The page's main action is the `default` variant at `size="sm"`. Do not restyle an outline button into a primary one with color classes.

Icon-only buttons that are not the `Button` primitive:

```tsx
const iconButton =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
```

### Card

```tsx
const card = "border border-border bg-card text-card-foreground"; // square
const cardHeader = "flex flex-col space-y-1.5 p-6";
const cardTitle = "font-medium leading-none tracking-[-0.01em]";
const cardContent = "p-6 pt-0";
```

A clickable card brightens its edge and turns its title mint: `transition-colors hover:border-foreground/25` with the title on `group-hover:text-brand`.

### Input, Textarea, Checkbox

```tsx
const input =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-base transition-colors placeholder:text-faint focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const textarea =
  "min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-faint focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring";

// Unchecked: an empty box. Checked: ink fill with a charcoal check.
const checkboxBox =
  "flex h-4 w-4 items-center justify-center rounded-sm border border-foreground/30 bg-transparent transition-colors peer-checked:border-foreground peer-checked:bg-foreground";
```

Radio rows and option cards are `rounded-md border p-3`, selected with `border-foreground/40 bg-foreground/5`, otherwise `border-border hover:bg-foreground/5`.

### Tabs

```tsx
const tabBase = "-mb-px border-b-2 px-0.5 pb-2.5 text-sm transition-colors";
const tabActive = "border-brand font-medium text-foreground";
const tabInactive = "border-transparent text-muted-foreground hover:text-foreground";
const tabDisabled = "border-transparent text-muted-foreground/50";
```

The active tab's text is ink, not mint; the mint is the underline.

### Segmented Control

Keep the bordered, divided treatment. Round the group, not the segments.

```tsx
const segmentedGroup =
  "inline-flex overflow-hidden rounded-md border border-input divide-x divide-border text-[13px]";
const segment = "px-2.5 py-1 transition-colors";

// In forms: a quiet fill.
const segmentSelected = "bg-foreground/15 text-foreground";
const segmentIdle = "text-muted-foreground hover:bg-accent hover:text-foreground";

// Above charts (metric pickers): an ink fill.
const chartSegmentSelected = "bg-foreground text-background";
```

### Dialog, Menu, Tooltip, Toast

```tsx
const dialogOverlay = "fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]";
const dialogContent =
  "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-2xl shadow-black/50 focus:outline-none";

const menuContent =
  "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-black/40";
const menuItem =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-foreground/10";

const tooltipContent =
  "z-50 overflow-hidden rounded-md border bg-popover px-2.5 py-1.5 text-[13px] leading-5 text-popover-foreground shadow-md shadow-black/40";

const toast =
  "rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg shadow-black/40";
```

Dialog header: the title and the close button share one centered row. The close button is taller than the title's line, so pull it in with negative margins rather than letting it stretch the row.

```tsx
<div className="flex items-center justify-between gap-4">
  <div className="inline-flex items-center gap-1.5">
    <DialogPrimitive.Title className="text-base font-medium">Add Models</DialogPrimitive.Title>
    <HelpTooltip label="About Add Models">Select one or more models.</HelpTooltip>
  </div>
  <DialogPrimitive.Close asChild>
    <button type="button" aria-label="Close" className={`-my-1 -mr-2 ${iconButton}`}>
      <X className="size-4" aria-hidden="true" />
    </button>
  </DialogPrimitive.Close>
</div>
```

A dialog with `p-0` and ruled sections needs `overflow-hidden` (or `overflow-y-auto`) so the sections do not poke through the rounded corners.

### Utility Helper

Use a `cn(...)`-style helper for class merging when available. Do not manually concatenate large conditional class strings if the local codebase already has a class helper.

## Layout And Density

- Page shell: `px-6 py-6`. The title is a lone `h1` (`mb-6 text-xl font-medium`), or sits in a centered row with the page's action: `mb-6 flex items-center justify-between gap-4`.
- Cards and panels: `border border-border bg-card p-4`, or the card primitive.
- Joined cells (stat tiles, plan cards): one outer `border border-border`, with `divide-x divide-border` or `gap-px bg-border` between cells. Do not give each cell its own box and a gap.
- Stat tile: label `text-xs text-muted-foreground` with an optional `size-3.5 text-faint` icon, value in the headline-number style, detail `text-xs text-muted-foreground`.
- Label-and-control rows inside a card: `flex min-h-11 items-center justify-between gap-4 border-b border-border py-1.5 last:border-b-0`, label in `text-faint`. Every row is the same height whatever control it holds; the card adds no padding under the last row.
- A card header with a title block on the left and controls on the right is `flex items-center justify-between gap-4 px-4 py-3`, followed by a `border-t`. Equal padding top and bottom.
- Tables: square outer border, `divide-y divide-border`, compact `px-3 py-2` rows, headers `text-xs font-medium text-faint`.
- Forms: `space-y-4`/`space-y-6`, labels `text-sm font-medium` or `text-[13px] font-medium`.
- Empty and info states: a square bordered box with concise copy that says what to do next.

## Small Parts

```tsx
// Chip: a filled tag, no border.
<span className="inline-flex h-5 items-center rounded-sm bg-foreground/[0.07] px-1.5 text-xs text-muted-foreground" />

// Badge: a bordered state.
<span className="rounded-sm border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-[11px] font-medium text-brand" />

// Notices are inline, so they are rounded.
<div className="rounded-md border border-brand/40 bg-brand/10 p-3 text-sm" />                 {/* info, success */}
<div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning" /> {/* needs attention */}
<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm" />     {/* error */}

// Code and commands.
<pre className="overflow-x-auto rounded-lg border border-border bg-foreground/[0.03] px-3.5 py-3 font-mono text-xs leading-5 text-foreground" />

// Meters and score bars.
<span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
  <span className="block h-full rounded-full bg-brand" style={{ width: "40%" }} />
</span>

// Status dot.
<span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />

// Text link in prose.
<a className="text-foreground underline decoration-foreground/35 underline-offset-4 hover:decoration-foreground" />
```

Technical values inline: `<code className="font-mono text-xs text-muted-foreground">openai/gpt-6.1-sol</code>`. A model's display name is sans; its slug underneath is mono.

## Sidebar

- Groups: **Gateway** (Routers, Subscriptions & Keys, Activity), **Organization** (Usage, API Keys, Models, Evals, Settings), **Resources**. Group headings are `text-xs font-medium text-sage`.
- Items are `rounded-md text-sm text-muted-foreground` with a `text-faint` icon. The active item is `bg-sidebar-accent font-medium text-foreground` with a mint icon.
- The wordmark is the round logo mark beside `dari.dev` in `font-wordmark text-base font-medium tracking-[-0.01em]`.
- The page that manages subscriptions and provider keys is called **Subscriptions & Keys** everywhere a user sees it. Its path is still `/credentials`.

## Charts

- Series colors come from `--chart-1` to `--chart-9`, in that order, in every chart. Never start a palette from a different slot, reorder it, or add a hue in the middle; the order is what keeps neighbors apart for color-blind readers. Past nine, mix a slot toward the foreground (`color-mix(in srgb, var(--chart-1) 68%, hsl(var(--foreground)))`).
- `--chart-red` marks errors. It is never a series.
- A single-series chart uses `--chart-1`. A brand-accented mark (cached share, the eval frontier) may use `hsl(var(--brand))`.
- Grid: `stroke="hsl(var(--border))"`, solid, horizontal lines only. Ticks: `{ fill: "hsl(var(--faint))", fontSize: 11 }`, no tick lines. Hover cursor: `hsl(var(--foreground) / 0.05)`.
- Stacked bars take `stroke="hsl(var(--card))" strokeWidth={1}` so segments read as separate.
- Chart tooltip: `rounded-lg border border-border bg-popover p-3 text-xs shadow-lg shadow-black/40`.
- Text beside a mark stays in text tokens. The colored mark carries identity; the label is not colored to match.

## Interaction Patterns

- Focus is `focus-visible:ring-1 focus-visible:ring-ring` (mint). Inputs also take `focus-visible:border-ring`.
- Hover is subtle: `hover:bg-accent` on the page, `hover:bg-foreground/10` on popovers and inside filled areas, `hover:border-foreground/40` on outlined controls, `hover:text-foreground` on quiet text.
- Copy buttons swap their icon for a mint check for two seconds and announce it in an `sr-only` `role="status"`.
- Icons are lucide line icons, `size-3.5` or `size-4`, usually `text-faint` or `text-muted-foreground`. Reserve mint icons for state (active, copied, confirmed).
- A dialog that opens by itself should focus the dialog, not ring its close button: `onOpenAutoFocus={(event) => { event.preventDefault(); (event.currentTarget as HTMLElement).focus(); }}`.
- Stacked Tailwind variants apply right to left. To style a child when the parent has a state, the child selector goes first: `[&>svg]:data-[active=true]:text-brand` builds `.x[data-active=true]>svg`. The other order targets a child that carries the attribute itself and silently does nothing.

## Writing In The UI

- Title Case for headings, controls, badges, metadata labels, and short enum-like values. Sentence case for descriptions and helper text. Use `Your Evals` and `Public Evals` exactly.
- Do not restate a heading in a sentence beneath it. If the user needs the extra fact, it goes in the heading's `HelpTooltip`.
- A control says what it does and a link says where it goes; use the destination's own name (`Subscriptions & Keys`, `API Keys`).
- Plan names, prices, and summaries match the pricing page word for word.

## Good Dari Patterns

```tsx
<section className="border border-border bg-card">
  <div className="flex items-center justify-between gap-4 px-4 py-3">
    <div className="min-w-0">
      <span className="block text-sm font-medium">GPT-6.1 Sol</span>
      <code className="block truncate font-mono text-xs text-muted-foreground">openai/gpt-6.1-sol</code>
    </div>
    <span className="inline-flex h-7 items-center rounded-md border border-border px-2 text-xs tabular-nums text-muted-foreground">
      $2 · $10 /M
    </span>
  </div>
  <div className="border-t border-border px-4 text-xs">
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-border py-1.5 last:border-b-0">
      <span className="text-faint">Thinking</span>
      <div className="inline-flex overflow-hidden rounded-md border border-input divide-x divide-border text-[13px]">
        <button className="bg-foreground/15 px-2.5 py-1 text-foreground" aria-pressed="true">Low</button>
        <button className="px-2.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-pressed="false">High</button>
      </div>
    </div>
  </div>
</section>
```

```tsx
<dl className="grid gap-px border border-border bg-border sm:grid-cols-3">
  <div className="min-w-0 bg-card px-4 py-3">
    <dt className="text-xs text-muted-foreground">Provider Spend</dt>
    <dd className="mt-1.5 text-2xl font-medium tabular-nums tracking-[-0.03em]">$2.13</dd>
    <div className="mt-1 text-xs text-muted-foreground">Selected model inference</div>
  </div>
</dl>
```

```tsx
<div className="border border-border bg-card p-4">
  <h3 className="text-sm font-medium">No Routers Yet</h3>
  <p className="mt-1 text-sm text-muted-foreground">
    Create a router to expose an endpoint and choose the models it can use.
  </p>
  <Button size="sm" className="mt-4">Create Router</Button>
</div>
```

## Anti-Patterns To Remove Or Reject

- The retired look: amber accents, JetBrains Mono as the body font, zero-radius buttons and inputs, `uppercase tracking-widest` labels, 8–10px text.
- Mono for names, labels, numbers, or prose. Sans for a slug, command, or key.
- Rounded cards, panels, tables, or tiles. Square buttons, inputs, chips, menus, or dialogs. Pills.
- Mint on a warning, on every icon in a row of tiles, or as body text color.
- Tailwind palette classes or hex in class names; `bg-white`/`text-black` for a primary button.
- A helper sentence under a section, card, or dialog heading, or a description under a page title.
- A dialog title top-aligned beside its close button; label rows of different heights in one card; a card header padded more on top than below.
- Gradients, glows, `backdrop-blur` on anything but the dialog overlay, shadows on things that do not float.
- Chart palettes that start somewhere other than `--chart-1`, cycle hues, use red for a series, or draw dashed and vertical gridlines.
- New CSS files or inline styles for ordinary UI. Use Tailwind tokens and existing primitives.

## Review Checklist Before Finishing

1. Is everything on the grid square and everything pressed or floating rounded?
2. Is mono used only for code, commands, IDs, slugs, and keys?
3. Are colors tokenized, with mint for accent/good, ochre for warning, red for error?
4. Are labels `text-xs text-faint` in Title Case, with nothing uppercase-tracked and nothing under 11px?
5. Does every heading stand alone, with helper text in a `HelpTooltip`?
6. Are titles centered against their close buttons, and are rows in a card the same height?
7. Do charts draw from `--chart-1` onward in order?
8. Did you reuse existing primitives instead of creating a one-off style system?
9. If code changed, run the relevant frontend check from the package you touched, and look at the result in a browser.

For a quick style lint on your own changes, inspect the diff from the repo root:

```bash
git diff | rg "^\+" | rg "uppercase|tracking-widest|text-\[(8|9|10)px\]|rounded-(xl|2xl|3xl)|font-(semibold|bold)|bg-gradient|bg-white|text-black|(amber|orange|yellow|emerald|green|blue|purple|pink|cyan|neutral|zinc|gray)-[0-9]|chart-(amber|cyan|blue|green|orange|violet|rose|lime|indigo)"
```

Two hits are allowed: the plan-name label (`text-[10px] ... uppercase tracking-[0.14em]`) and a one-time code shown in spaced mono (`font-mono text-xl tracking-widest`). `rounded-full` is fine on avatars, dots, and meters, and `bg-black/60` is the dialog overlay.

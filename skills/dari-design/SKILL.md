---
name: dari-design
description: Design and implement UI that matches Dari's frontend visual language. Use when creating or reviewing React/Tailwind UI for the Dari frontend, designing Dari screens, or making an interface consistent with Dari's hard-edged dark mono style.
---

# Dari Design

Use this skill for any Dari app UI work.

This skill is intentionally self-contained. Do **not** tell agents to open named Dari frontend files just to learn the design system. Rely on the tokens, primitive contracts, and examples embedded below. Only inspect source files when you are editing that specific code, checking imports/types, or validating behavior.

## Visual Contract

Dari is a hard-edged, dark, mono, dense tool UI:

- Warm off-black background, low-contrast borders, amber accent.
- Square surfaces; no visible radius.
- Borders and separators instead of shadows or decorative depth.
- Compact spacing and technical typography.
- Utility-first Tailwind with design tokens; no one-off CSS for normal UI.

Do not invent a parallel design system. Reuse existing primitives when working in a codebase that has them, and match the embedded primitive contracts below when creating new UI.

## Non-Negotiables

- **Hard edges. No rounded corners.** Do not introduce arbitrary or fixed radius classes like `rounded-[...]`, `rounded-full`, `rounded-xl`, pills, bubbles, circular avatars, soft cards, or capsule CTAs. Shadcn-style classes such as `rounded-md` are only acceptable when the Tailwind radius contract below resolves them to `0px`; new Dari UI should be visibly square.
- **Dark mono interface.** The app is warm off-black, mono, dense, and tool-like. Use the JetBrains Mono stack. Do not add a second font family.
- **Token colors only.** Prefer `bg-background`, `bg-card`, `bg-muted/*`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-brand`, `border-brand`, `bg-brand/10`, and `destructive` tokens. Avoid hard-coded hex and random Tailwind palettes.
- **Amber is the accent.** Brand amber is for active nav, focused controls, primary highlights, link/hover accents, and informative callouts. Do not introduce blue/purple SaaS accents.
- **Borders over shadows.** Structure surfaces with `border border-border`, `divide-border`, and low-opacity fills. Avoid new `shadow*`, glows, gradients, glassmorphism, blobs, or decorative backgrounds.
- **Uppercase only where Dari uses it.** Use `uppercase tracking-widest` for metadata labels, table headers, small enum labels, and technical key labels (`ID`, `Models`, `Updated`). For normal headings/buttons/tabs, use Title Case labels and sentence-case helper text.
- **No ornamental UI.** No emoji, illustrations, oversized rounded icons, marketing gradients, confetti, or playful empty states unless Avyay explicitly asks.

## Embedded Theme Contract

Canonical CSS tokens:

```css
:root,
.dark {
  --background: 30 6% 4%;
  --foreground: 30 8% 93%;

  --card: 30 5% 6%;
  --card-foreground: 30 8% 93%;

  --popover: 30 5% 6%;
  --popover-foreground: 30 8% 93%;

  --muted: 30 5% 8%;
  --muted-foreground: 30 5% 60%;

  --border: 30 5% 14%;
  --input: 30 5% 14%;

  --brand: 38 95% 55%;
  --brand-dark: 32 70% 38%;
  --ring: var(--brand);

  --primary: 0 0% 100%;
  --primary-foreground: 0 0% 0%;

  --secondary: 30 5% 10%;
  --secondary-foreground: 30 8% 93%;

  --accent: 30 5% 13%;
  --accent-foreground: 30 8% 93%;

  --destructive: 0 72% 45%;
  --destructive-foreground: 0 0% 98%;
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family:
    "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

::selection {
  background: hsl(var(--foreground));
  color: hsl(var(--background));
}
```

Canonical Tailwind contract:

```ts
const zero = "0px";

const themeContract = {
  fontFamily: {
    sans: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
    mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  },
  colors: {
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    muted: {
      DEFAULT: "hsl(var(--muted))",
      foreground: "hsl(var(--muted-foreground))",
    },
    card: {
      DEFAULT: "hsl(var(--card))",
      foreground: "hsl(var(--card-foreground))",
    },
    popover: {
      DEFAULT: "hsl(var(--popover))",
      foreground: "hsl(var(--popover-foreground))",
    },
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",
    primary: {
      DEFAULT: "hsl(var(--primary))",
      foreground: "hsl(var(--primary-foreground))",
    },
    secondary: {
      DEFAULT: "hsl(var(--secondary))",
      foreground: "hsl(var(--secondary-foreground))",
    },
    accent: {
      DEFAULT: "hsl(var(--accent))",
      foreground: "hsl(var(--accent-foreground))",
    },
    destructive: {
      DEFAULT: "hsl(var(--destructive))",
      foreground: "hsl(var(--destructive-foreground))",
    },
    brand: {
      DEFAULT: "hsl(var(--brand))",
      dark: "hsl(var(--brand-dark))",
    },
  },
  borderRadius: {
    none: zero,
    sm: zero,
    DEFAULT: zero,
    md: zero,
    lg: zero,
    xl: zero,
    "2xl": zero,
    "3xl": zero,
    full: zero,
  },
};
```

Common color combinations:

```tsx
<div className="border border-border bg-card text-card-foreground" />
<div className="border border-border bg-muted/20 text-muted-foreground" />
<div className="border border-brand/40 bg-brand/10 text-brand" />
<div className="border border-destructive/50 bg-destructive/10 text-destructive-foreground" />
```

White/black CTAs (`bg-white text-black hover:bg-white/90`) are acceptable when matching primary create/action buttons, but do not make the rest of the app light.

## Embedded Primitive Contracts

Use these as the style/API contract for common primitives. If an app already has these primitives, import and reuse them instead of duplicating them.

### Button

```tsx
const buttonBase =
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

const buttonVariants = {
  default: "bg-primary text-primary-foreground border border-primary hover:bg-primary/90",
  outline: "border border-border bg-transparent text-foreground hover:bg-accent",
  ghost: "bg-transparent text-foreground hover:bg-accent",
  destructive:
    "bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive/90",
};

const buttonSizes = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};
```

### Card

```tsx
const card = "border border-border bg-card text-card-foreground";
const cardHeader = "flex flex-col space-y-1.5 p-6";
const cardTitle = "font-medium leading-none tracking-tight";
const cardDescription = "text-sm text-muted-foreground";
const cardContent = "p-6 pt-0";
const cardFooter = "flex items-center p-6 pt-0";
```

### Input

```tsx
const input =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";
```

`rounded-md` is acceptable here only because the theme contract maps every radius token to `0px`.

### Tabs

```tsx
const tabBase = "-mb-px border-b-2 px-1 pb-2 text-sm transition-colors";
const tabActive = "border-brand text-foreground";
const tabInactive = "border-transparent text-muted-foreground hover:text-foreground";
const tabDisabled = "border-transparent text-muted-foreground/50";
```

### Utility Helper

Use a `cn(...)`-style helper for class merging when available. Do not manually concatenate large conditional class strings if the local codebase already has a class helper.

## Layout And Density

- Page shell: `px-6 py-6` with a compact header block and content below.
- Headers: usually `text-xl font-medium`; descriptions are `mt-1 text-sm text-muted-foreground`.
- Cards/panels: `border border-border bg-card p-4` or the card primitive contract above.
- Empty/error/info states: square bordered boxes, low-opacity background, concise copy.
- Tables/lists: square outer border, `divide-y divide-border`, compact `px-3 py-2` rows.
- Forms: `space-y-4`/`space-y-6`, labels `text-sm font-medium`, helper text `text-xs` or `text-sm text-muted-foreground`.
- Details/technical values: use mono text, `text-xs`, truncation, and uppercase metadata labels.

## Interaction Patterns

- Prefer existing primitives for buttons, inputs, cards, dropdowns, tabs, separators, and class merging.
- Focus rings should use `focus-visible:ring-1 focus-visible:ring-ring` or the embedded primitive default.
- Hover is subtle: `hover:bg-accent`, `hover:bg-muted/30`, `hover:border-brand-dark`, or `hover:text-foreground`.
- Active navigation/state uses brand amber sparingly: `data-[active=true]:text-brand`, `border-brand`, or `bg-brand/10`.
- Icons should be lucide-style line icons, small (`h-3.5 w-3.5` or `h-4 w-4`), and usually `text-muted-foreground` or `text-brand`.

## Good Dari Patterns

```tsx
<section className="border border-border bg-card p-4">
  <h2 className="text-sm font-medium">Router Health</h2>
  <p className="mt-1 text-sm text-muted-foreground">
    Recent selector behavior for this router.
  </p>
  <dl className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground">
    <div>
      <span className="uppercase tracking-widest">Requests</span>{" "}
      <span className="text-foreground">128</span>
    </div>
    <div>
      <span className="uppercase tracking-widest">Updated</span>{" "}
      <span className="text-foreground">2 min ago</span>
    </div>
  </dl>
</section>
```

```tsx
<button
  type="button"
  className="border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
>
  Refresh Models
</button>
```

```tsx
<div className="border border-border bg-muted/20 p-3">
  <div className="flex items-center justify-between gap-3">
    <div>
      <p className="text-sm font-medium">No Runs Yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Trigger a run to see model routing decisions here.
      </p>
    </div>
    <button className="border border-border px-3 py-2 text-xs text-foreground hover:bg-accent">
      Start Run
    </button>
  </div>
</div>
```

## Anti-Patterns To Remove Or Reject

- `rounded-[50%]`, `rounded-full`, badges shaped like pills, circular avatars.
- Blue/purple/green SaaS accents (`bg-blue-*`, `text-purple-*`, gradients, neon glows).
- Large soft cards with `shadow-lg`, `backdrop-blur`, frosted panels, blurred blobs.
- Mixed fonts, variable display fonts, or non-mono marketing typography inside the app.
- All-caps paragraphs/headings. Uppercase is a small-label treatment, not the whole copy system.
- New CSS files or inline styles for ordinary UI. Use Tailwind tokens and existing primitives.

## Review Checklist Before Finishing

1. Does the diff add any actual rounded corners, arbitrary radii, pill badges, gradients, or shadows?
2. Are colors tokenized and aligned with warm black + amber?
3. Are labels/headings Title Case, helper text sentence case, and metadata labels uppercase/tracked?
4. Are surfaces square, bordered, compact, and mono?
5. Did you reuse existing primitives instead of creating a one-off style system?
6. If code changed, run the relevant frontend check from the package you touched.

For a quick style lint on your own changes, inspect the diff from the repo root:

```bash
git diff | rg "rounded-\[|rounded-full|rounded-(xl|2xl|3xl)|shadow|drop-shadow|gradient|from-|via-|to-|bg-(blue|purple|pink|green|cyan)"
```

Existing hits elsewhere in the app may be legacy; do not add new ones.

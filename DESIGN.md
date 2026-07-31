# Henry's Personal Website Design System

## 1. Atmosphere & Identity

A quiet, mostly-empty page in the spirit of small hand-made personal sites. One narrow text column sits left of center on a flat off-white canvas. Type is tiny, lowercase, and unadorned; structure comes from thin dashed rules, not boxes. A single cyan accent carries all interactivity, and a small pixel snowboarder on the home page is the only ornament.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Canvas | `--background` | `#F4F4F4` | `#111111` | The only surface; no panels |
| Text/primary | `--foreground` | `#1C1C1C` | `#E8E8E8` | Body, headings, nav |
| Text/secondary | `--muted` | `#6B6B6B` | `#828282` | Notes, dates, metadata, footer |
| Rule | `--border` | `#C6C6C6` | `#3A3A3A` | 1px dashed rules, image borders |
| Accent | `--accent` | `#0A7580` | `#4FD6E3` | Links, active nav, meters, mascot board |
| Code block | `--code` | `#EAEAEA` | `#1D1D1D` | Code backgrounds, image fallbacks |
| Surface alias | `--surface` | `#F4F4F4` | `#111111` | Legacy alias of the canvas; kept for iframes |

Syntax tones (`--syntax-*`) are monochrome ramps used inside code blocks; every tone clears WCAG AA (4.5:1) against `--code` in both themes.

### Rules

- One accent. Every interactive or highlighted element uses `--accent`; no second hue.
- No cards, panels, gradients, radii, or shadows. Structure is dashed 1px rules only.
- Solid 1px `--border` is reserved for functional edges: images, inputs, meter frames, tables.
- Text selection is accent-on-canvas.

## 3. Typography

### Scale

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Base | `13px` (1rem) | 400 | Everything: body, headings, nav, hero |
| Bold | `1rem` | 700 | Post titles, entry titles, emphasis |
| Small | `0.92rem` | 400 | Nav links, page notes, chips |
| Meta | `0.85rem` | 400 | Dates, excerpts, labels, footer links |
| Tiny | `0.77rem` | 400 | Copyright, ranks, tooltips, cover captions |

### Font Stack

- Primary: `Verdana, "DejaVu Sans", Geneva, Tahoma, sans-serif`
- Code: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, ... monospace` (self-hosted Consolas woff2)

### Rules

- There is no display type. Hierarchy comes from position, rules, and whitespace, not size.
- Headings and nav are lowercase (`text-transform: lowercase`). Prose body keeps its own case.
- Monospace appears only inside code fragments and code blocks.
- Line height is 1.7 sitewide.

## 4. Spacing & Layout

### Grid

- Content column: `min(640px, calc(100vw - clamp(1.5rem, 15vw, 17rem) - 7rem))`
- Column offset: `margin-left: clamp(1.5rem, 15vw, 17rem)` — left of center, never centered
- Page top: `--page-top: clamp(6rem, 18vh, 11rem)` (13rem under 560px to clear the fixed nav)
- Breakpoints: `560px` (stack), `760px` (lab/table adjustments), `1240px` (blog sidenotes float)

### Rhythm

| Amount | Usage |
|--------|-------|
| `42vh` | Between home sections (`.home-section`) |
| `24vh` | Above the footer |
| `3.5rem` | Between sections on content pages |
| `2rem` | Between list items (blog) |
| `1rem` and below | Inside components |

### Rules

- The page should feel mostly empty. When in doubt, add vertical space, not chrome.
- Everything is a single column. No sidebars, no multi-column dashboards.
- The first screen of the home page holds only the hero statement, the mascot, and the nav.

## 5. Components

### Shell
- **Nav**: fixed top-right, vertically stacked, right-aligned, tiny lowercase links. Active link is accent. Theme toggle sits under it in muted tiny type.
- **Site mark**: fixed top-left `hw`, muted, accent on hover.
- **Footer**: one muted tiny line — social links left, `© year henry wang` right.

### Section heading
Lowercase heading with a dashed rule filling the rest of the line (`display: flex` + `::after` rule). Used for page titles, resume sections, prose h1/h2, and music panel headers.

### Hero + mascot
Full-viewport first screen with the statement `henry wang — software engineer`. Below it, an original pixel snowboarder (box-shadow pixel art, two frames) carves along a dashed slope: frame swap at ~0.7s, full traverse ~17s. `prefers-reduced-motion` pins it to a static frame at rest.

### Lists
Bare text lines. Blog: accent title + muted date and excerpt, no markers, no boxes. Resume and plain lists: no bullets, muted body. The now page: dashed rules between entries, muted dates in a left column.

### Data widgets (lab, music)
Keep their functional grids but drop all chrome: dashed dividers between regions, accent for actions/active states, meters as 1px-bordered tracks with accent fill, album art with plain 1px borders.

## 6. Motion & Interaction

| Type | Duration | Usage |
|------|----------|-------|
| Micro | 120-160ms ease | Metadata reveals, meter fills |
| Mascot frames | 0.7s square-wave | Two-frame sprite swap |
| Mascot traverse | 17s linear loop | Carve across the column |

### Rules

- Links: accent color, underline only on hover/focus. Nav and quiet controls shift to accent instead.
- Focus is always visible: 1px accent outline, offset 3px.
- Animate only opacity and transform (the mascot's `left` traverse is the one sanctioned exception).
- Every animation must have a `prefers-reduced-motion` fallback; the mascot freezes to a static frame.

## 7. Depth & Surface

There is no depth. The canvas is the only surface; nothing floats above it except the fixed nav and the token-ghost tooltip, both of which sit on plain canvas with a dashed border at most. Do not reintroduce shadows, radii, gradients, or filled panels.

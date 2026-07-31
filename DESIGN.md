# Henry's Personal Website Design System

## 1. Atmosphere & Identity

A sparse technical notebook with a personal pulse. The signature is a mono-first rail of small facts: text stays compact, dividers do the structure, and interactive pieces look like terminal output made readable for the web.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | `--background` | `#FBFBFB` | `#111111` | Page background |
| Surface/secondary | `--surface` | `#FFFFFF` | `#181818` | Bordered panels and list items |
| Surface/code | `--code` | `#F2F2F2` | `#242424` | Code and compact highlighted text |
| Text/primary | `--foreground` | `#111111` | `#EEEEEE` | Body, headings, active controls |
| Text/secondary | `--muted` | `#666666` | `#AAAAAA` | Labels, captions, secondary links |
| Border/default | `--border` | `#D9D9D9` | `#444444` | Dividers, timelines, panel borders |
| Syntax/strong | `--syntax-strong` | `#000000` | `#FFFFFF` | Code keywords and strong tokens |
| Syntax/base | `--syntax-base` | `#222222` | `#EEEEEE` | Code body |
| Syntax/muted | `--syntax-muted` | `#555555` | `#B8B8B8` | Code identifiers |
| Syntax/faint | `--syntax-faint` | `#858585` | `#777777` | Code comments and punctuation |
| Syntax/mark | `--syntax-mark` | `#777777` | `#AAAAAA` | Code underlines and marks |

### Rules

- Use the existing CSS variables for all new UI. Do not introduce raw colors outside this file.
- Depth comes from borders, inverted text chips, and occasional hard offset shadows already present in lists.
- Accent color is intentionally absent; links and controls use text treatment instead.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | `clamp(2.75rem, 8vw, 4.75rem)` | 400 | 1.05 | 0 | Blog post titles |
| H1 | `2.4rem` | 400 | 1.12 | 0 | Page titles |
| H2 | `1.25rem` | 400-700 | 1.35 | 0 | Prose section headings |
| H3 | `1rem` | 700 | 1.43 | 0 | Panel headings, labels |
| Body | `14px` | 400 | 1.43 | 0 | Site-wide default |
| Body/sm | `0.85rem` | 400 | 1.45-1.55 | 0 | Notes, metadata, compact UI |
| Caption | `0.72rem` | 400 | 1.35 | 0 | Revealed metadata |

### Font Stack

- Primary: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
- Display: `Georgia, "Times New Roman", Times, serif`

### Rules

- Keep the mono voice as the default. Use the serif display stack only for the site name, page titles, and long-form title moments.
- Body text stays at or above 14px.
- Letter spacing remains 0 unless existing metadata patterns already define it.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight inline separations |
| `--space-2` | 8px | Compact row padding |
| `--space-3` | 12px | Small panel gaps |
| `--space-4` | 16px | Default panel padding |
| `--space-6` | 24px | Header/footer rhythm |
| `--space-8` | 32px | Major homepage blocks |
| `--space-12` | 48px | Page section separation |
| `--space-16` | 64px | Large page endings |

### Grid

- Max content width: `min(760px, calc(100% - 32px))`
- Main content offset: `clamp(0rem, 2vw, 1.25rem)` left padding
- Mobile breakpoint: `560px`
- Tablet breakpoint: `760px`

### Rules

- Prefer single-column layouts and narrow grids. Dense information should scan vertically.
- Labels usually sit left of values on desktop and stack on mobile.
- New spacing must use existing rem values that map to the base-4 rhythm.

## 5. Components

### Site Shell
- **Structure**: centered `.site-shell` with header, main, and footer.
- **Spacing**: header `3rem 0 1.5rem`, main bottom `4rem`, footer `2rem 0 3rem`.
- **States**: links use underline thickness and focus outlines, not colored backgrounds.
- **Accessibility**: header and footer links remain plain anchors with visible focus.

### Detail Timeline
- **Structure**: `dl` rows with muted `dt`, value `dd`, left rail, square pins.
- **Spacing**: rows use compact padding and a 7.5rem label column on desktop.
- **States**: inline links inherit site link treatment.
- **Accessibility**: preserve semantic `dl`, `dt`, and `dd`.

### Lab Panel
- **Structure**: bordered surface with heading, form/input area, and output area.
- **Spacing**: `1rem` internal padding, 1px dividers.
- **States**: loading/error states appear as bracketed or underlined text.
- **Accessibility**: live output regions use `aria-live` where results update.

### Spotify Stats
- **Structure**: compact section with header metadata, one featured track, ranked tracks/artists, and genre chips.
- **Spacing**: section margin follows homepage details; rows use base-4 multiples.
- **States**: loading, not configured, error, and ready states all render without layout shift.
- **Accessibility**: album/artist imagery has explicit dimensions and descriptive alt text.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 120-160ms | ease | Metadata reveals and meters |
| Standard | 200ms | ease | Hover border or shadow changes |

### Rules

- Animate only opacity and transform. Existing meter scaling uses `transform`.
- Respect `prefers-reduced-motion`; any new transition must have a reduced-motion fallback if it is more than decorative.
- Interactive elements must have hover and focus-visible states.

## 7. Depth & Surface

### Strategy

Borders-first with occasional hard mono offset shadows.

| Type | Value | Usage |
|------|-------|-------|
| Default border | `1px solid var(--border)` | Panels, dividers, media |
| Strong border | `1px solid var(--foreground)` | Featured list items |
| Hard offset | `3px 3px 0 var(--foreground)` | Selected repeated items |

New homepage experiment surfaces should use default borders first and reserve hard offsets for emphasis.

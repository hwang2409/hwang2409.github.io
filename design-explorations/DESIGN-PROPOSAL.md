# WEB-4 Design Proposal — HENRY(1): the site as a manual page

Fifty mockups live in `mockups/` (browse them via `index.html`). Henry reviewed them and picked
`16-man-page.html` — "the homepage as man(1)" — as the winner. This document elaborates that
direction into an implementable design system, with the runner-up directions kept short at the end.

The brief, restated as constraints:

- **Keep:** absolute minimalism, simplicity, the animations (and the pixel snowboarder — see 5.4).
- **Fix:** nothing personal in the current design; the color scheme (off-white `#F4F4F4` + cyan +
  tiny Verdana) is disliked.

Why man(1) satisfies both at once: a manual page is the most minimal document format that is still
a *format* — hierarchy from case, weight, and indent alone; no boxes, no chrome, two colors. And it
is intensely personal for Henry specifically: he builds terminal agent harnesses (zeta), lives in
tmux, and writes docs-as-notes (wiki). The site stops imitating generic minimalism and starts
speaking his native file format. One metaphor, honored everywhere (**Mental Model**); the format's
labels — NAME, DESCRIPTION, SEE ALSO — are self-explanatory in plain English, so visitors who have
never opened a terminal lose nothing (**Paradox of the Active User**: the interface teaches itself).

---

## 1. Color tokens

Two themes: **paper** (default — a printed man page) and **term** (dark — the same page read in a
pager). One link accent, one warn tone, everything else monochrome. All text pairs verified for
WCAG AA (4.5:1 or better) via relative-luminance calculation; measured ratios below.

### Paper (light, default)

| Role | Token | Value | On | Ratio |
|------|-------|-------|----|----|
| Canvas | `--background` | `#F9F7F1` | — | — |
| Text | `--foreground` | `#1E1E1E` | background | 15.56:1 |
| Secondary | `--muted` | `#67665F` | background | 5.38:1 |
| Link (the accent) | `--accent` | `#00507A` | background | 8.07:1 |
| Warn / highlight | `--warn` | `#8A4B00` | background | 6.35:1 |
| Code block | `--code` | `#EFECE2` | (surface) | text 14.10:1, links 7.32:1 |
| Rule | `--border` | `#D9D5C9` | (non-text, 1px) | — |
| Statusline bg | `--status-bg` | `#1E1E1E` | — | — |
| Statusline fg | `--status-fg` | `#F9F7F1` | status-bg | 15.56:1 |

### Term (dark)

| Role | Token | Value | On | Ratio |
|------|-------|-------|----|----|
| Canvas | `--background` | `#121417` | — | — |
| Text | `--foreground` | `#D9DEE5` | background | 13.65:1 |
| Secondary | `--muted` | `#8E97A3` | background | 6.24:1 |
| Link (the accent) | `--accent` | `#7CB8E4` | background | 8.64:1 |
| Warn / highlight | `--warn` | `#D2A452` | background | 8.06:1 |
| Code block | `--code` | `#1A1D21` | (surface) | text 12.51:1, links 7.92:1 |
| Rule | `--border` | `#2A2E34` | (non-text, 1px) | — |
| Statusline bg | `--status-bg` | `#D9DEE5` | — | — |
| Statusline fg | `--status-fg` | `#121417` | status-bg | 13.65:1 |

Rules:

- The statusline is always inverse video of the page — that is the pager idiom, and it makes the
  one persistent UI element unmissable without adding a third hue (**Von Restorff**).
- `--warn` appears only in genuinely exceptional lines (a WARN entry on /now, a failing demo in
  /lab). Never decorative. Links are the only other colored text (**Similarity**: color = clickable,
  with the single audited warn exception).
- Text selection: `--accent` background, canvas foreground. Focus: 1px solid `--accent` outline,
  offset 2px (carried over from the current system).
- The theme toggle survives, relabeled `TERM=paper` / `TERM=xterm` in the statusline (see 4).

Why this fixes the color complaint: `#F4F4F4` is a default gray; `#F9F7F1` is warm paper stock —
the same austerity, but chosen. The cyan dies; the link blue is a deep manual-page blue that reads
as ink, not as UI chrome (**Aesthetic-Usability Law**: identical information, perceived as crafted).

## 2. Typography and spacing

### Type

One family. A man page has exactly one voice:

- Stack: `ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace`. No webfont,
  no request. `-webkit-font-smoothing: antialiased` at the root; `font-variant-numeric: tabular-nums`
  globally (everything is monospace anyway, but this keeps composed numbers stable in the
  statusline).
- Base: `14px / 1.75` (up from today's 13px Verdana; mono at 14px measures like 15px prose).

Hierarchy comes from case, weight, and indent — never size. The full scale:

| Level | Size | Style | Usage |
|-------|------|-------|-------|
| Header line | 14px | plain, `--muted` | `HENRY(1)   General Commands Manual   HENRY(1)` |
| Section head | 14px | **bold**, UPPERCASE, flush left | NAME, DESCRIPTION, PROJECTS... |
| Body | 14px | plain | everything |
| Emphasis | 14px | **bold** / *italic* | commands bold, arguments/files italic (roff convention) |
| Statusline | 13px | plain, inverse | pager bar |
| Fine print | 12px | `--muted` | image captions, copyright |

This is a deliberate departure from the current all-lowercase rule: section heads are uppercase
because the format demands it; body text and page content stay lowercase-casual. Two cases, each
with one job (**Prägnanz**: the simplest reading — caps = structure, lower = content).

### Spacing and layout

- Column: keep the current formula and left-of-center offset
  (`min(640px, calc(100vw - clamp(...) - 7rem))`, `margin-left: clamp(1.5rem, 15vw, 17rem)`) but
  allow 42rem max on man-style pages — mono needs the extra measure. The site keeps its
  signature off-center stance.
- Indent grammar (the whole layout system, three rules):
  - Section heads: flush left, `margin-top: 2.2rem`.
  - Section bodies: indented `2.5rem` (the roff `.RS`).
  - Tagged lists (options, projects, entries): two-column grid, `9rem` label + text,
    collapsing to stacked at 560px — this replaces every list style on the site (**Chunking**,
    **Proximity**: label and value grouped by alignment, no boxes).
- Vertical rhythm: `2.2rem` between sections on content pages; the home page keeps generous
  air (`~4rem` between its man sections) but drops the `42vh` voids — a man page is one continuous
  scroll, and the statusline's line counter would make giant empty gaps feel broken.
- Page bottom: `3.5rem` padding above the fixed statusline so content never hides under it.
- No dashed rules anywhere anymore. Structure is typographic. The only 1px solid `--border`
  edges are functional: images, inputs, tables, meter frames (survives from the current system).

## 3. Page-by-page mapping

Every page is a manual page with a name, a section number, and a statusline. Section numbers are
real man conventions used as quiet jokes: 1 = user commands, 5 = file formats, 7 = miscellanea,
8 = admin.

Persistent chrome on every page: the header line (`NAME(n)` left, manual name center, `NAME(n)`
right — center hidden under 560px), the fixed statusline at the bottom, and the top-left site mark
`hw(1)` linking home (replaces the current `hw`). There is no fixed top-right nav; SYNOPSIS *is*
the nav on home, and every subpage's header + SEE ALSO provide the way back (**Serial Position**:
first line names the page, last section links onward).

### home — HENRY(1)

- `NAME` — `henry wang — software engineer`
- `SYNOPSIS` — `henry [blog] [projects] [music] [lab] [now] [resume]` — each bracket a link.
  This is the primary nav: six targets, one line (**Hick's Law**).
- `DESCRIPTION` — the about paragraph; `--interests` / `--also` as a tagged option list
  (uwaterloo, phoebe.work, fish.audio, nationgraph, ML/graphics/game theory, snowboarding, music).
- `PROJECTS` — tagged list: wiki, zeta, newt+chimy2 with one-line excerpts, linking to /projects.
- `EXAMPLES` — the pixel snowboarder carves through this section (see 5.4). Caption in fine
  print: `fig. 1 — the author, descending`. The only graphic on the page (**Von Restorff**: the
  one pattern-break is the one thing people remember; **Peak-End**: it sits near the end of the
  scroll).
- `SEE ALSO` — `github(1), mail(1), spotify(7)`.
- `COLOPHON` — copyright, "this page is intentionally quiet."
- Statusline: `Manual page henry(1)` · right side `line 1/1 (END)` with blinking block cursor.

### blog — HENRY-BLOG(7)

- List page: one `ENTRIES` section, tagged list — date in the label column (`2026-07-13`),
  bold title + muted excerpt in the text column. `kind` frontmatter (note/demo/writeup/project)
  renders as a trailing italic tag, e.g. *[demo]*.
- Post page: header becomes `WIKI(7)`; frontmatter maps to `NAME` (title — excerpt) and the body
  flows as `DESCRIPTION` plus the post's own h2s promoted to man sections (uppercase). Existing
  sidenotes become `NOTES` interjections: indented, `--muted`, with an italic `note:` label —
  inline under 1240px, floating in the margin above it (adapting, not killing, the current
  sidenote behavior).
- Statusline: list — `henry-blog(7) — 7 entries`; post — live reading position
  `line 214/620 (34%)` updating on scroll (see 4; **Goal-Gradient**: visible progress toward
  (END) pulls readers through).

### projects — HENRY-PROJECTS(7)

- List page: styled as `apropos henry` output — each line
  `wiki(7) — a local markdown vault and agent workspace`, name bold-linked. Three lines, no
  more structure than that (**Occam's Razor**).
- Detail pages: each project is a full manual: `NAME`, `SYNOPSIS` (what it is in one line),
  `DESCRIPTION` (the existing write-up prose), `HISTORY` (dates), `SEE ALSO` (repo link, related
  posts). Screenshots keep 1px `--border` frames with fine-print captions.
- Statusline: list — `henry-projects(7) — 3 write-ups`; detail — reading position.

### music — HENRY-MUSIC(7)

- `NOW PLAYING` — the Spotify current track as a single tagged entry; when live, its label
  column shows `STREAMING` in `--warn` (the page's one exceptional line).
- `FILES` — top albums/artists as a tagged list; album art keeps functional 1px borders, sized
  to the label column grid. Art is the page's only color beyond the tokens — on paper it reads
  like plates in a printed manual.
- Statusline: `henry-music(7) — now playing: <track>` (truncated with an ellipsis; static text
  `not playing` when idle).

### lab — HENRY-LAB(8)

- Section 8: admin territory — the one page allowed denser terminal affordances (**Flow**:
  it is the hands-on page). Each demo is an `EXAMPLES` block: a `--code` surface, run controls
  as bracketed verbs `[run] [reset]`, meters as 1px-framed tracks with stepped fills (see 4).
  Model status lines use `OK` / `WARN` in the label column.
- Statusline: `henry-lab(8) — 2 models loaded — runs locally`.

### now — HENRY-NOW(5)

- Section 5, because /now literally documents a file format: append-only entries. Entries as a
  tagged list — date label, category in italics, body text. Newest first, as today.
- Statusline: `henry-now(5) — last modified 2026-07-31` (**Zeigarnik**: the visible staleness
  date is the open loop that nags the author to update it).

### resume — HENRY-RESUME(1)

- The most conservative mapping: `NAME`, `EXPERIENCE`, `EDUCATION`, `SKILLS` as sections with
  tagged entries (dates in label column). A print stylesheet ships with this page: black on
  white, no statusline — a man page already is a resume format (**Jakob's Law**: behaves like
  the document recruiters expect, just better typeset).
- Statusline: `henry-resume(1) — rev 2026 — press cmd+p for paper`.

## 4. Motion language

A pager is not animated; its aliveness is the cursor. The motion budget, smallest of any
direction in the set:

1. **Cursor blink** — the statusline's block cursor blinks at 1.06s, `steps(1)`. This is the
   heartbeat of every page (**Doherty Threshold**: the page renders instantly — no reveal
   choreography, because instant *is* the terminal's feedback — and the blink signals live).
2. **Statusline counter** — on scroll, `line N/M (pct%)` updates. Numbers are tabular so nothing
   shifts. Update on animation frame, no smoothing — discrete jumps are the idiom. At the bottom
   it reads `(END)`, which is also the emotional sign-off (**Peak-End**: every page literally
   ends with a word).
3. **Stepped fills** — lab meters and any progress animate with `steps(n)`, never easing.
   Mechanical things tick; nothing on this site eases except the mascot.
4. **Link feedback** — underline appears on hover/focus via CSS transition (120ms,
   underline-offset only). Bracketed verbs in /lab invert (`--accent` bg, canvas fg) on hover.
5. **The mascot traverse** — unchanged 0.7s frame swap + 17s linear carve (see 5.4).

`prefers-reduced-motion: reduce`: cursor becomes solid, statusline counter still updates (it is
information, not decoration), stepped fills jump to final state, mascot freezes to a static frame
at rest — the current system's exact fallback, preserved.

## 5. What survives from the current system

- **Layout DNA** — the off-center single column, the `hw` mark (now `hw(1)`), the one-surface
  no-panel rule, footer-as-one-line (now COLOPHON + statusline). No cards, shadows, radii,
  gradients — the man page needs the prohibition even more than the old design did.
- **One-accent discipline** — survives as the link blue, with the single audited `--warn`
  exception. Dashed rules die (typographic structure replaces them); solid 1px borders keep their
  functional-edges-only role.
- **Images: adapt.** Keep the 1px `--border` frame; add fine-print captions styled
  `fig. N — description`, because a manual illustrates, it doesn't decorate. Screenshots inside
  posts are indented with the section body.
- **Code blocks: keep, simplified.** On an all-mono site a code block needs only the `--code`
  surface and the body indent — no font switch, no language chrome. The monochrome syntax ramp
  from the current system survives as-is (it was the most man-page-like thing the old design had);
  both themes' ramps must clear 4.5:1 on `--code`, same as today's rule.
- **Mermaid/diagrams: adapt.** Rendered monochrome — `--foreground` strokes on canvas, `--accent`
  only for emphasized nodes — so diagrams read as figures in the manual, not pasted-in web content.
  Framed and captioned like images.
- **The pixel mascot: keep, recontextualized.** It is the site's one pre-existing personality
  asset and Henry asked to keep the animations. In a page of pure type, a two-frame pixel
  snowboarder carving through the EXAMPLES section is a perfect deadpan joke — the illustration
  the manual didn't need (**Von Restorff**, **Peak-End**). Its dashed slope line is the single
  sanctioned dashed rule on the site (a drawing, not structure). Home page only; reduced-motion
  freeze unchanged.
- **Theme toggle: keep**, moved into the statusline as `TERM=paper` / `TERM=xterm` — a real
  toggle, right where a terminal would declare it (**Tesler's Law**: the statusline absorbs page
  metadata — position, theme, freshness — so the content column carries zero chrome; **Working
  Memory**: persistent context you recognize instead of recall).

What dies: `#F4F4F4`, the cyan, 13px Verdana, dashed structural rules, the fixed top-right nav
stack, and the `42vh` voids on home.

## 6. The strongest alternatives (kept short)

- `15-tui-panels` — the sibling direction; box-drawing panels and keyboard hints. Steal for /lab
  if it ever needs panel structure.
- `02-midnight-slopes` — the best non-terminal identity (night riding, moonlit ridge). If HENRY(1)
  ever feels too dry, this is the palette to warm the term theme toward.
- `41-cron-log` — biography as `tail -f`; its dated log-line grammar is effectively the /now page
  design and can be lifted wholesale.
- `37-fixed-timestep` — source of the stepped-motion rule adopted in 4.3.
- `09-paper-marginalia` — the humanist counterweight; its handwritten-aside energy is what the
  blog NOTES interjections should aspire to in tone.

Verdict: build HENRY(1). It is the only direction of the fifty where the format itself is the
personality — minimal because manuals are minimal, personal because this particular person
actually lives in the pager.

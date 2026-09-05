# HENRY(1) design system

The site is a man(1) manual page. It uses one format on every route: a manual
header, uppercase section names, indented bodies, tagged lists, and an inverse
pager statusline. The format is the site's identity.

## color tokens

The default theme is `paper`. `xterm` is the same page in a dark pager.

| role | paper | xterm |
| --- | --- | --- |
| `--background` | `#F9F7F1` | `#121417` |
| `--foreground` | `#1E1E1E` | `#D9DEE5` |
| `--muted` | `#67665F` | `#8E97A3` |
| `--accent` | `#00507A` | `#7CB8E4` |
| `--warn` | `#8A4B00` | `#D2A452` |
| `--code` | `#EFECE2` | `#1A1D21` |
| `--border` | `#D9D5C9` | `#2A2E34` |
| status background | `#1E1E1E` | `#D9DEE5` |
| status text | `#F9F7F1` | `#121417` |

Links use `--accent`. `--warn` is for real exceptional states only. The
statusline always uses inverse video. Focus uses a 1px accent outline with a
2px offset. Selection uses accent background and canvas text.

## typography and layout

All text uses `ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace`.
The base size is 15px with a 1.75 line height. Hierarchy comes from case,
weight, and position. Section names are bold uppercase. Body text stays casual
and lowercase when the source uses lowercase.

The content column is `min(46rem, calc(100vw - 2 * clamp(1.25rem, 5vw, 3rem)))`
with `margin-inline: auto`. Section bodies use a 2.5rem indent. Tagged lists
use a 9rem label column and stack below 560px. Blog margin notes hang in a
12rem gutter at viewports 1150px and wider, then fold inline. The bottom
statusline has 3.5rem of content clearance.

There are no cards, shadows, rounded corners, gradients, or decorative dashed
rules. Solid borders are for functional edges: images, inputs, tables, meters,
and focused source markers.

## page mappings

- `/` is `HENRY(1)`: NAME, SYNOPSIS, DESCRIPTION, PROJECTS, EXAMPLES, MUSIC,
  SEE ALSO, and COLOPHON.
- `/blog` is `HENRY-BLOG(7)`: ENTRIES uses dates, titles, excerpts, and kind tags.
- `/blog/[slug]` is `WIKI(7)`: NAME and DESCRIPTION wrap the existing post tools
  and markdown output. Markdown headings become uppercase manual sections.
- `/projects` is `HENRY-PROJECTS(7)`: an `apropos henry` list.
- `/projects/[slug]` is a full manual with NAME, SYNOPSIS, DESCRIPTION, HISTORY,
  and SEE ALSO.
- `/music` is `HENRY-MUSIC(7)`: NOW PLAYING and the existing Spotify shelves.
- `/lab` and `/labs` are `HENRY-LAB(8)`: EXAMPLES and dense terminal controls.
- `/now` is `HENRY-NOW(5)`: newest append-only entries first.
- `/resume` is `HENRY-RESUME(1)`: NAME, EXPERIENCE, EDUCATION, SKILLS, and print output.

## shell and motion

`hw(1)` links home. Every route has a quiet SYNOPSIS-style navigation row with
links for blog, projects, music, lab, now, and resume. The current section is
bold text with `aria-current="page"`. Home SYNOPSIS remains the primary home
navigation. A skip-to-content link is the first focusable element.

Sub-page man-headers link their left and right name fields to the section index.
Blog posts and project pages with at least three level-two headings get a
tagged-list CONTENTS section after NAME. Markdown headings receive stable ids
for those links. Blog posts end with SEE ALSO links for adjacent posts and
`henry-blog(7)`.

The fixed statusline contains page status, a live discrete line counter, a
blinking block cursor, and the `TERM=paper` / `TERM=xterm` theme toggle. Theme
state persists in local storage and applies before the page paints.

The cursor blinks at 1.06 seconds with `steps(1)`. Scroll position updates on an
animation frame. Lab meters use stepped transitions. Links use a 120ms underline
transition. The mascot keeps its 0.7 second frame swap and 17 second traverse.
Reduced motion makes the cursor solid, freezes the mascot, and jumps meters to
their final state. The line counter still updates because it carries information.

Images retain 1px frames and `fig. N — description` captions. Code keeps the
monochrome syntax ramp on a `--code` surface. Mermaid diagrams use the site
tokens, with accent color only for emphasis.

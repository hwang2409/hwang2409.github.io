# minimal site design system

the site is a quiet set of personal pages. it uses plain text, whitespace, links,
and small functional controls. it does not use a manual-page metaphor.

## tokens

| role | light | dark |
| --- | --- | --- |
| `--background` | `#FFFFFF` | `#000000` |
| `--foreground` | `#111111` | `#E5E5E5` |
| `--muted` | `#555555` | `#AAAAAA` |
| `--border` | `#CCCCCC` | `#444444` |
| `--code` | `#F2F2F2` | `#111111` |

the dark palette comes from `prefers-color-scheme`. there is no theme toggle or
theme storage. every color is neutral grayscale. links use the text color and
keep an underline. focus uses a one-pixel `currentColor` outline. selection
inverts the foreground and background.

## type and layout

the primary stack is `Consolas, Inconsolata, ui-monospace, "SF Mono", Menlo,
monospace`. inconsolata is bundled with `next/font/google`, so non-windows
platforms do not fall back to a system mono font. the base size is 16px and the
line height is 1.7. the centered content column is 40rem wide at most, with one
rem of side padding.

the vertical rhythm uses five steps: `.35rem`, `.7rem`, `1.25rem`, `2rem`, and
`3rem`. sections use the largest step. related content uses the smaller steps.
all pages use this rhythm for headings, lists, panels, posts, projects, music,
lab, resume, now, and 404 content.

the header has one home link and six lowercase section links: blog, projects,
music, lab, now, and resume. on home, the header shows only navigation, so the
page has one semantic `h1` instead of a repeated name. the header wraps on small
screens. every page has the same small muted footer with email, github, linkedin,
x, and copyright.

## page content

the home page has a name, role, short about paragraph, interests sentence, project
list, music line, mascot, quote, and contact links. the mascot uses grayscale
pixels and modest breathing room.

the blog index shows one row per post with a muted date and title link. posts show
a title, date line, tools, prose, optional contents list, and previous or next
links. heading ids, source maps, word guessing, code token inspection, mermaid,
and iframe resize behavior remain available.

projects, music, lab, now, resume, and 404 use the same plain page treatment.
their existing data and interactive behavior stays intact. resume print styles
stay intact.

markdown headings render as normal headings. margin notes keep a right gutter on
wide screens and fold into the prose below that breakpoint. code blocks and
mermaid diagrams use grayscale tokens only.

## deliberate absence

the site has no manual headers, status pager, live line counter, blinking cursor,
theme switch, SYNOPSIS brackets, uppercase section transform, tagged manual lists,
fixed corner link, cards, shadows, rounded boxes, gradients, accent colors, or
decorative rules.

borders are limited to functional controls, tables, code surfaces, images, and
margin notes. the pixel mascot is the only decorative flourish.

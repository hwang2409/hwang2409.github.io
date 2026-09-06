# minimal site design system

the site is a quiet set of personal pages. it uses plain text, whitespace, links,
and small functional controls. it does not use a manual-page metaphor.

## tokens

| role | light | dark |
| --- | --- | --- |
| `--background` | `#FFFFFF` | `#111111` |
| `--foreground` | `#171717` | `#EDEDED` |
| `--muted` | `#6B6B6B` | `#A1A1A1` |
| `--border` | `#D7D7D7` | `#404040` |
| `--code` | `#F4F4F4` | `#1B1B1B` |
| `--accent` | `#145A86` | `#83C5F2` |
| `--warn` | `#8A4B00` | `#E3B36B` |

the dark palette comes from `prefers-color-scheme`. there is no theme toggle or
theme storage. links use the accent color and keep an underline on hover and focus.
focus uses a one-pixel accent outline.

## type and layout

all text uses `Consolas, ui-monospace, "SF Mono", Menlo, "DejaVu Sans Mono", monospace`.
the base size is 16px. the base line height is 1.65. code uses the same mono stack.

the centered content column is 40rem wide at most, with one rem of side padding.
headings use modest size and weight changes. authored case stays unchanged. spacing
creates hierarchy.

the header has one home link and six lowercase section links: blog, projects, music,
lab, now, and resume. the current section is plain text with `aria-current="page"`.
the header wraps on small screens. every page has the same small muted footer with
email, github, linkedin, x, and copyright.

## page content

the home page has a name, role, short about paragraph, interests sentence, project
list, music line, mascot, and contact links. the mascot appears only on home.

the blog index shows one row per post with a muted date and title link. posts show a
title, date line, tools, prose, optional contents list, and previous or next links.
heading ids, source maps, word guessing, code token inspection, mermaid, and iframe
resize behavior remain available.

projects, music, lab, now, resume, and 404 use the same plain page treatment. their
existing data and interactive behavior stays intact. resume print styles stay intact.

markdown headings render as normal headings. margin notes keep a right gutter on wide
screens and fold into the prose below that breakpoint.

## deliberate absence

the site has no manual headers, status pager, live line counter, blinking cursor,
theme switch, SYNOPSIS brackets, uppercase section transform, tagged manual lists,
fixed corner link, cards, shadows, rounded boxes, gradients, or decorative rules.

borders are limited to functional controls, tables, code surfaces, images, and margin
notes. the pixel mascot is the only decorative flourish.

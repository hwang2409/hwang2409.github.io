# minimal site design system

the site is a quiet set of personal pages. it uses plain text, whitespace, links,
and small functional controls. it does not use a manual-page metaphor.

## tokens

| role | value |
| --- | --- |
| `--background` | `#FFFFFF` |
| `--foreground` | `#111111` |
| `--muted` | `#555555` |
| `--border` | `#CCCCCC` |
| `--code` | `#F2F2F2` |

the site is light mode only. there is no dark palette, no theme toggle, and no
theme storage. every color is neutral grayscale. links use the text color and
keep an underline. focus uses a two-pixel `currentColor` outline. selection
inverts the foreground and background.

## type and layout

the primary stack is `var(--font-jetbrains-mono), ui-monospace, "SF Mono",
Menlo, Consolas, monospace`. jetbrains mono v2.304 is self-hosted from
`src/fonts/` via `next/font/local` (full build, so box-drawing glyphs render
in-family), so visitors get the same font across platforms. the base
size is 15px and the line height is 1.7. the centered content column is 55rem
wide at most, with one rem of side padding.

the vertical rhythm uses five steps: `.35rem`, `.7rem`, `1.25rem`, `2rem`, and
`3rem`. sections use the largest step. related content uses the smaller steps.
all pages use this rhythm for headings, lists, panels, posts, projects, music,
resume, now, and 404 content.

the header has one home link and four lowercase section links: blog, projects,
music, and now. the `/resume` route stays live but unlisted, shared by URL
only. on home, the header shows only navigation, so the
page has one semantic `h1` instead of a repeated name. the header wraps on small
screens. every page has the same small muted footer with email, github, linkedin,
x, and copyright; it stays pinned to the viewport bottom while the page scrolls.

## page content

the home page has a name, short about paragraph, mascot, and music line;
projects live on their own page and contact links live in the shared footer.
the mascot uses grayscale pixels and modest breathing room.

the blog index shows one row per post with a muted date and title link. posts show
a title, date line, tools, prose, optional contents list, and previous or next
links. heading ids, source maps, word guessing, code token inspection, mermaid,
and iframe resize behavior remain available.

projects, music, now, resume, and 404 use the same plain page treatment.
their existing data and interactive behavior stays intact. resume print styles
stay intact.

markdown headings render as normal headings. margin notes keep a right gutter on
wide screens and fold into the prose below that breakpoint. code blocks and
mermaid diagrams use grayscale tokens only.

## project posts

project posts on `/projects/<slug>` follow a shared shape. each major
section is anchored by a short trimmed excerpt from the project's real
source, copied faithfully with `// ...` for elided fields and followed
by lowercase prose that names the fields and why they exist. excerpts
run three to ten lines, never full-file dumps, and fences are tagged
(```rust, ```ts, ```sh). every claim matches the source at its current
main.

the post reads 0 -> 1: the first type introduces the smallest object at
the root (a pixel, a document), and each later section adds the next
type that composes the previous ones. existing widgets stay in place;
code excerpts replace vague prose, never demos.

## deliberate absence

the site has no manual headers, status pager, live line counter, blinking cursor,
theme switch, SYNOPSIS brackets, uppercase section transform, tagged manual lists,
fixed corner link, cards, shadows, rounded boxes, gradients, accent colors, or
decorative rules.

borders are limited to functional controls, tables, code surfaces, images, and
margin notes. the pixel mascot is the only decorative flourish.

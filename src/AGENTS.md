# FRONTEND KNOWLEDGE BASE

## OVERVIEW

Next.js App Router frontend, statically exported for GitHub Pages. This subtree owns routes, UI components, markdown loaders, local browser experiments, and visual style.

## STRUCTURE

```txt
src/
├── app/          # route files and global shell
├── components/   # client widgets and reusable UI surfaces
└── lib/          # markdown/content/search/ngram helpers
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Site shell | `app/layout.tsx` | Theme and blog-case bootstrap script live here. |
| Homepage | `app/page.tsx` | Personal facts plus Spotify stats widget. |
| Blog pages | `app/blog/`, `app/blog/[slug]/page.tsx` | Pull from `lib/blog.ts` and `content/blog/`. |
| Blog rendering | `lib/blog.ts` | Remark/Rehype pipeline, syntax tones, sidenotes, source map. |
| Lab page | `app/lab/page.tsx` | Uses local search, local n-gram model, WASM/browser panel. |
| `/labs` alias | `app/labs/page.tsx` | Re-exports `/lab`; keep behavior aligned. |
| Components | `components/` | Client components usually own their own state. |
| Site corpus/search | `lib/siteData.ts`, `lib/localNgram.ts`, `lib/siteIndex.ts` | Build-time local data helpers. |

## CONVENTIONS

- Use `@/*` imports for `src/*`.
- New UI must follow `../DESIGN.md`: tiny lowercase sans, flat canvas, dashed rules, single accent, no boxes or shadows.
- Base type is 13px; preserve visible focus states.
- Everything is one narrow left-offset column; structure with whitespace and dashed rules, not panels.
- Client components start with `'use client'`; keep server route files thin when possible.
- The site is static-exported. Browser-only behavior must tolerate build-time rendering and hydration.
- `next/image` is configured unoptimized. External images must still specify dimensions.

## CODE MAP

| Symbol | Location | Role |
|--------|----------|------|
| `RootLayout` | `app/layout.tsx` | Shared shell for all routes. |
| `BlogPostPage` | `app/blog/[slug]/page.tsx` | Dynamic markdown post page. |
| `getAllBlogPosts` | `lib/blog.ts` | Reads all markdown posts from disk. |
| `markdownToHtml` | `lib/blog.ts` | Converts markdown to HTML with custom transforms. |
| `getSearchDocuments` | `lib/siteData.ts` | Builds local search documents. |
| `getClientNGramModel` | `lib/siteData.ts` | Builds browser n-gram model from site corpus. |
| `SpotifyStats` | `components/SpotifyStats.tsx` | Fetches backend Spotify stats and renders compact states. |
| `LocalSearchPanel` | `components/LocalSearchPanel.tsx` | Client-side blog search experiment. |

## ANTI-PATTERNS

- Do not edit `out/` for frontend changes; rebuild instead.
- Do not add page-level marketing hero patterns unless the design file changes first.
- Do not split `/lab` and `/labs` accidentally; `/labs` is an alias.
- Do not add fetches that require Next server runtime. The deployed frontend is static.
- Do not expand `components/SpotifyStats.tsx` further without first splitting it.

## VERIFICATION

```bash
npm run lint
npx tsc --noEmit
npm run build
NEXT_PUBLIC_LAB_API_URL=http://127.0.0.1:8000 npm run build
```

For browser-facing changes, serve `out/` and check the hydrated page, not only build output.

# PROJECT KNOWLEDGE BASE

**Generated:** 2026-06-22 11:22:21 EDT
**Commit:** d0905c5
**Branch:** main

## OVERVIEW

Personal website workspace: static-export Next.js frontend plus a small FastAPI backend for lab/API experiments. Content is file-backed markdown; deployment is split between GitHub Pages for the frontend and Railway for `backend/`.

## STRUCTURE

```txt
website/
├── src/                 # Next App Router, components, content loaders
├── backend/             # FastAPI app, Railway config, Spotify helper scripts
├── content/             # markdown sources for blog and now page
├── public/              # checked-in static assets
├── .github/workflows/   # two overlapping GitHub Pages workflows
├── DESIGN.md            # source of truth for UI tone/tokens
├── Makefile             # full-stack local dev commands
└── next.config.ts       # static export settings
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Homepage | `src/app/page.tsx` | Imports backend-fed Spotify widget. |
| Shared shell | `src/app/layout.tsx` | Header, footer, theme script, global shell. |
| Blog index/post routes | `src/app/blog/`, `src/app/blog/[slug]/page.tsx` | Uses `src/lib/blog.ts` and markdown in `content/blog/`. |
| Lab route | `src/app/lab/page.tsx` | `/labs` re-exports this page as an alias. |
| Now page | `src/app/now/page.tsx`, `src/lib/now.ts`, `content/now.md` | Markdown-backed. |
| UI components | `src/components/` | Mostly client components and lab/blog widgets. |
| Content/data loaders | `src/lib/` | `blog.ts` is the largest/highest-risk file. |
| Backend API | `backend/app/main.py` | FastAPI app root and `/token/*` endpoints. |
| Spotify API | `backend/app/spotify.py`, `backend/app/spotify_*` | `/spotify/stats` and auth/cache/models. |
| Backend scripts | `backend/scripts/` | PEP 723 `uv run --script` helpers. |
| Deployment | `.github/workflows/`, `backend/railway.toml` | Frontend and backend deploy separately. |

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| `Home` | Next page | `src/app/page.tsx` | route | Homepage content and Spotify widget mount. |
| `RootLayout` | Next layout | `src/app/layout.tsx` | all routes | Site shell and theme/blog-case bootstrap script. |
| `BlogPostPage` | Next page | `src/app/blog/[slug]/page.tsx` | route | Markdown rendering plus blog tools. |
| `generateStaticParams` | Next static hook | `src/app/blog/[slug]/page.tsx` | build | Enumerates markdown blog slugs. |
| `getAllBlogPosts` | loader | `src/lib/blog.ts` | several routes | Reads `content/blog/*.md`, sorts newest first. |
| `markdownToHtml` | renderer | `src/lib/blog.ts` | blog posts | Remark/Rehype pipeline with syntax, sidenotes, source map. |
| `getClientNGramModel` | data helper | `src/lib/siteData.ts` | blog/lab | Builds local n-gram model from site corpus. |
| `SpotifyStats` | client component | `src/components/SpotifyStats.tsx` | homepage | Fetches `${NEXT_PUBLIC_LAB_API_URL}/spotify/stats`. |
| `app` | FastAPI app | `backend/app/main.py` | runtime | Backend entrypoint for Railway and local uvicorn. |
| `spotify_stats` | FastAPI handler | `backend/app/spotify.py` | route | Public sanitized Spotify stats endpoint. |
| `SpotifyStatsResponse` | Pydantic model | `backend/app/spotify_models.py` | backend/API | Stable response contract for frontend parsing. |
| `spotify_endpoint_check.py` | script | `backend/scripts/` | manual smoke | Verifies deployed/local Spotify endpoint without secrets. |

## CONVENTIONS

- Treat `DESIGN.md` as the UI source of truth. The top-level `README.md` is partly stale: it still mentions Tailwind and old component names.
- Frontend deploy is static export: `next.config.ts` has `output: 'export'`, `trailingSlash: true`, and unoptimized images.
- `out/` and `.next/` are generated build output. Do not edit them as source.
- Use `@/*` for imports from `src/*`.
- Backend runs from the `backend/` service root on Railway. The Railway start command imports `app.main:app`.
- Real env files are ignored. `backend/.env.example` is the committed template.
- There is currently no test suite. Verification is lint/build/typecheck plus backend smoke checks and manual/browser QA when UI changes.

## ANTI-PATTERNS (THIS PROJECT)

- Do not add new UI colors outside existing CSS variables and `DESIGN.md`.
- Do not treat `npm run start` as the production deploy path; GitHub Pages serves `out/`.
- Do not assume `/lab` and `/labs` are different implementations; `/labs` aliases `/lab`.
- Do not commit real Spotify credentials, Railway secrets, or local `.env` files.
- Do not rely on production backend state as proof of local code; Railway may lag the repo.
- Do not add a third deploy workflow without first resolving the two existing Pages workflows.

## UNIQUE STYLES

- Mono-first, sparse technical-notebook interface.
- Borders/dividers carry structure; accent color is intentionally absent.
- Blog tooling includes lowercase toggle, source-map overlay, token ghost, Mermaid, iframe resize, and code token inspection.
- Lab panels are compact diagnostic surfaces, not marketing sections.

## COMMANDS

```bash
make dev
make backend
make frontend
make install
npm run lint
npx tsc --noEmit
npm run build
PYTHONPATH=backend backend/.venv/bin/python -m compileall backend/app backend/scripts
uv run backend/scripts/spotify_endpoint_check.py --allow-unavailable
```

## NOTES

- GitHub Actions has two Pages workflows: `.github/workflows/deploy.yml` and `.github/workflows/nextjs.yml`. They use different Node versions and deploy mechanisms.
- `backend/scripts/*.py` are executable PEP 723 scripts; run with `uv run`, not plain `python`.
- `src/lib/blog.ts` is over 500 physical lines and owns markdown parsing/rendering/source-map logic. Prefer careful, focused edits there.
- `src/components/SpotifyStats.tsx` is at the local 250 pure-LOC ceiling from prior work; split parsing/rendering before expanding it.

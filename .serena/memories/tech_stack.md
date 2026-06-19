# Tech Stack

- Next.js 15 App Router with React 19 and static export (`output: 'export'` in `next.config.ts`).
- TypeScript, strict mode, path alias `@/* -> ./src/*`.
- Markdown pipeline: `gray-matter`, `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-highlight`, `rehype-stringify`.
- Mermaid diagrams are client-rendered by `src/components/MermaidRenderer.tsx`.
- Styling is plain global CSS in `src/app/globals.css`; Tailwind/PostCSS were removed.
- Local Consolas WOFF2 files in `public/fonts/` are the site font source.
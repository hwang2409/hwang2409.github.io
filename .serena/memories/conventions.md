# Conventions

- Preserve the minimal static document feel: text controls, grayscale, no icons, no animation, no decorative backgrounds.
- Use Consolas only for UI and content typography.
- Prefer build-time/static metadata over runtime services for technical easter eggs.
- Blog code blocks carry monochrome syntax metadata from `src/lib/blog.ts`; client enhancements should reuse `data-tone` / `data-token` when possible.
- Blog prose should sound human and direct: avoid em dashes, inflated product-copy wording, and needlessly grand phrasing.
- Keep user local state like `.serena/` out of git commits unless explicitly requested.
# Task Completion

- For code/content changes that affect rendering, run `npm run lint` and `npm run build`.
- For UI behavior, use Playwright via `/Users/henry/.codex/skills/webapp-testing/scripts/with_server.py` with a temporary verifier script, then delete the script.
- Before committing, inspect `git status --short` and avoid staging `.serena/`.
- If deploying, commit on `main` and `git push origin main`.
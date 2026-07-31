# BACKEND KNOWLEDGE BASE

## OVERVIEW

Small FastAPI service deployed separately on Railway. It serves local token/ngram endpoints and the Spotify stats experiment consumed by the static frontend.

## STRUCTURE

```txt
backend/
├── app/             # FastAPI app, routers, models, local n-gram backend
├── scripts/         # PEP 723 uv helper/smoke scripts
├── data/            # checked-in corpus for n-gram endpoint
├── railway.toml     # Railway start and healthcheck config
├── requirements.txt # runtime dependencies
└── .env.example     # committed local/Railway env template
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| API entrypoint | `app/main.py` | `app = FastAPI(...)`, CORS, `/health`, `/build`, token endpoints. |
| Local n-gram model | `app/site_ngram.py`, `data/site_corpus.txt` | Used by `/token/next`. |
| Spotify route | `app/spotify.py` | Public `/spotify/stats` handler. |
| Spotify auth/errors | `app/spotify_auth.py` | Basic auth header, refresh-token exchange, typed errors. |
| Spotify cache | `app/spotify_cache.py` | In-process TTL cache controlled by `SPOTIFY_CACHE_SECONDS`. |
| Spotify models | `app/spotify_models.py` | Pydantic v2 request/response boundary models. |
| Refresh-token helper | `scripts/spotify_refresh_token.py` | Generates approval URL and exchanges copied redirect URL/code. |
| Endpoint smoke check | `scripts/spotify_endpoint_check.py` | Checks deployed/local `/spotify/stats` and `/build` on 404. |
| Railway deploy | `railway.toml`, `README.md` | Service root must be `/backend`. |

## CONVENTIONS

- Run backend commands from repo root unless a doc explicitly says `cd backend`.
- Railway imports `app.main:app`; keep `backend` as the service root or pass `--app-dir backend` locally.
- API response models are Pydantic v2 models with frozen config.
- Spotify secrets stay only in env vars: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`.
- If Spotify vars are absent, `/spotify/stats` returns `status=not_configured`, not an HTTP error.
- If Spotify returns `invalid_grant`, return `status=reauthorization_required` so the frontend can fail quietly.
- Scripts in `backend/scripts/` are PEP 723 scripts. Keep the shebang, metadata block, and how-to-run comments.
- Network code uses `httpx2[http2,brotli,zstd]` with explicit timeouts, limits, retries, and `TCP_NODELAY`.

## ANTI-PATTERNS

- Do not print Spotify client secrets, refresh tokens, or access tokens.
- Do not commit real `.env` files; update `.env.example` when env requirements change.
- Do not make `/spotify/stats` require frontend-visible secrets.
- Do not convert the helper scripts to plain venv-only scripts; they are intended to run with `uv run --script`.
- Do not use production 404 as proof the route is missing locally; check `/build` and local uvicorn.
- Do not point Railway at repo root unless imports/start command are changed too.

## COMMANDS

```bash
make backend
PYTHONPATH=backend backend/.venv/bin/python -m compileall backend/app backend/scripts
uv run backend/scripts/spotify_refresh_token.py
uv run backend/scripts/spotify_refresh_token.py --code '<FULL_REDIRECTED_URL>'
uv run backend/scripts/spotify_endpoint_check.py --base-url http://127.0.0.1:8000 --allow-unavailable
uv run backend/scripts/spotify_endpoint_check.py
```

## DEPLOYMENT NOTES

- `railway.toml` uses `RAILPACK`, watches `/backend/**`, starts `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and health-checks `/health`.
- `/build` reports backend version, Railway commit, deployment id, and environment. Use it to identify stale production deployments.
- `backend/.env.example` mirrors the Railway variables. Source it locally with `set -a; source backend/.env; set +a` from repo root or `source .env` after `cd backend`.

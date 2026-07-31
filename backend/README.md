# Website Lab API

Small FastAPI backend for technical experiments on the static site.

`/token/next` uses a checked-in local n-gram model trained from `data/site_corpus.txt`.
It does not call Anthropic, OpenAI, or any external model provider.

`/spotify/now` reads the current Spotify playback and falls back to the latest recently
played track. `/spotify/stats` reads Henry's top Spotify tracks and artists through
Spotify's Web API. Both endpoints only return sanitized display data; the Spotify refresh
token and access tokens stay on the backend.

## Local development

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
set -a; source .env; set +a
uvicorn app.main:app --reload --port 8000
```

If the frontend is opened at a LAN URL such as `http://192.168.1.72:3000`,
add that exact origin to `ALLOWED_ORIGINS` in `.env` and restart the backend.
For another device on the LAN, run uvicorn with `--host 0.0.0.0` and point
`NEXT_PUBLIC_LAB_API_URL` at `http://192.168.1.72:8000`.

Test it:

```bash
curl http://localhost:8000/health
```

## Railway

Deploy this repo as a Railway service with:

```txt
Root Directory: /backend
Config File: /backend/railway.toml
Watch Paths: /backend/**
```

The start command and health check live in `railway.toml`.

Set these service variables:

```txt
ENV=production
ALLOWED_ORIGINS=https://hwng.ca,https://www.hwng.ca,https://hwang2409.github.io,https://phoebe.work,http://localhost:3000,http://localhost:3010,http://localhost:3012,http://127.0.0.1:3010,http://127.0.0.1:3012
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REFRESH_TOKEN=...
SPOTIFY_CACHE_SECONDS=1800
SPOTIFY_NOW_CACHE_SECONDS=20
SPOTIFY_HISTORY_DB=backend/data/spotify_history.sqlite3
```

## Spotify setup

Create a Spotify app in the Spotify Developer Dashboard. Add this redirect URI to the
app's allowlist unless you pass a different one to the helper:

```txt
http://127.0.0.1:8888/callback
```

Then generate a refresh token locally:

```bash
export SPOTIFY_CLIENT_ID=...
export SPOTIFY_CLIENT_SECRET=...
uv run backend/scripts/spotify_refresh_token.py
```

Open the printed Spotify approval URL. After approving, Spotify redirects to a local URL
that does not need to be served; copy the full browser address bar URL and exchange it:

```bash
uv run backend/scripts/spotify_refresh_token.py --code '<FULL_REDIRECTED_URL>'
```

The backend expects these variables:

```txt
SPOTIFY_CLIENT_ID=<Spotify app client id>
SPOTIFY_CLIENT_SECRET=<Spotify app client secret>
SPOTIFY_REFRESH_TOKEN=<refresh token authorized with user-top-read user-read-currently-playing user-read-recently-played>
SPOTIFY_CACHE_SECONDS=1800
SPOTIFY_NOW_CACHE_SECONDS=20
SPOTIFY_HISTORY_DB=backend/data/spotify_history.sqlite3
```

Spotify announced refresh token expiration on June 18, 2026. New developer apps are
affected immediately, and existing apps are affected from July 20, 2026:

```txt
https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
https://developer.spotify.com/blog/2026-06-18-refresh-token-expiration
```

Refresh `SPOTIFY_REFRESH_TOKEN` before it expires. If Spotify returns `invalid_grant`,
`/spotify/now` and `/spotify/stats` return `status=reauthorization_required` and the website
renders a quiet unavailable state. `SPOTIFY_CACHE_SECONDS` is optional and defaults to 1800
seconds for top stats. `SPOTIFY_NOW_CACHE_SECONDS` is optional and defaults to 20 seconds for
current playback. Set either cache variable to 0 to disable that in-process cache. If the
variables are absent, both endpoints return configured=false responses.

`/spotify/observe` samples current playback into the local SQLite database at
`SPOTIFY_HISTORY_DB`. `/spotify/insights` reads that local history for play counts,
completion/skip rates, session shape, repeat behavior, artist depth, album runs, and
timeline buckets. The static `/music` page calls `/spotify/observe` while it is open.

Smoke-check the local backend without printing any secrets:

```bash
uv run backend/scripts/spotify_endpoint_check.py
```

While setting up scopes or credentials, allow the unavailable states:

```bash
uv run backend/scripts/spotify_endpoint_check.py --base-url http://127.0.0.1:8000 --allow-unavailable
```

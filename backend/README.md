# Website Lab API

Small FastAPI backend for technical experiments on the static site.

`/token/next` uses a checked-in local n-gram model trained from `data/site_corpus.txt`.
It does not call Anthropic, OpenAI, or any external model provider.

## Local development

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

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
ALLOWED_ORIGINS=https://hwng.ca,https://www.hwng.ca,https://hwang2409.github.io,https://phoebe.work,http://localhost:3000
```

from __future__ import annotations

import os
import re
import time
from pathlib import Path
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.site_ngram import NGramModel


APP_VERSION = "0.2.0"
TOKEN_PATTERN = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d+(?:\.\d+)?|[^\w\s]")
CORPUS_PATH = Path(__file__).resolve().parent.parent / "data" / "site_corpus.txt"
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://hwang2409.github.io",
    "https://hwng.ca",
    "https://www.hwng.ca",
    "https://phoebe.work",
]


def _allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "")
    configured = [part.strip() for part in raw.split(",") if part.strip()]
    return sorted({*DEFAULT_ALLOWED_ORIGINS, *configured})


def _token_kind(value: str) -> Literal["word", "number", "punct"]:
    if value.replace(".", "", 1).isdigit():
        return "number"
    if any(char.isalpha() for char in value):
        return "word"
    return "punct"


def _tokenize(text: str) -> list["Token"]:
    return [
        Token(value=match.group(0), start=match.start(), end=match.end(), kind=_token_kind(match.group(0)))
        for match in TOKEN_PATTERN.finditer(text)
    ]


def _load_local_model() -> NGramModel:
    return NGramModel(CORPUS_PATH.read_text(encoding="utf-8"))


class HealthResponse(BaseModel):
    ok: bool
    service: str
    version: str
    env: str


class BuildResponse(BaseModel):
    version: str
    commit: str | None
    deployment_id: str | None
    railway_environment: str | None


class Token(BaseModel):
    value: str
    start: int
    end: int
    kind: Literal["word", "number", "punct"]


class TokenizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4_000)


class TokenizeResponse(BaseModel):
    tokens: list[Token]
    count: int


class NextTokenRequest(BaseModel):
    context: str = Field(..., min_length=1, max_length=4_000)
    top_k: int = Field(5, ge=1, le=10)


class TokenPrediction(BaseModel):
    token: str
    score: float


class NextTokenResponse(BaseModel):
    model: str
    predictions: list[TokenPrediction]
    entropy_bits: float
    latency_ms: float
    context_chars: int
    last_token: str | None
    matched_context: list[str]
    order: int
    training_tokens: int
    note: str


local_model = _load_local_model()

app = FastAPI(
    title="Website Lab API",
    version=APP_VERSION,
    description="Backend for small technical experiments on the static website.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/", response_model=HealthResponse)
def root() -> HealthResponse:
    return health()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        ok=True,
        service="website-lab-api",
        version=APP_VERSION,
        env=os.getenv("ENV", "development"),
    )


@app.get("/build", response_model=BuildResponse)
def build() -> BuildResponse:
    return BuildResponse(
        version=APP_VERSION,
        commit=os.getenv("RAILWAY_GIT_COMMIT_SHA") or os.getenv("GIT_SHA"),
        deployment_id=os.getenv("RAILWAY_DEPLOYMENT_ID"),
        railway_environment=os.getenv("RAILWAY_ENVIRONMENT_NAME"),
    )


@app.post("/tokenize", response_model=TokenizeResponse)
def tokenize(request: TokenizeRequest) -> TokenizeResponse:
    tokens = _tokenize(request.text)
    return TokenizeResponse(tokens=tokens, count=len(tokens))


@app.post("/token/next", response_model=NextTokenResponse)
def next_token(request: NextTokenRequest) -> NextTokenResponse:
    started = time.perf_counter()
    tokens = _tokenize(request.context)
    last = tokens[-1].value.lower() if tokens else None
    result = local_model.predict(request.context, request.top_k)
    predictions = [
        TokenPrediction(token=prediction.token, score=prediction.score)
        for prediction in result.predictions
    ]
    latency_ms = (time.perf_counter() - started) * 1_000

    return NextTokenResponse(
        model="site-ngram-v1",
        predictions=predictions,
        entropy_bits=round(result.entropy_bits, 3),
        latency_ms=round(latency_ms, 3),
        context_chars=len(request.context),
        last_token=last,
        matched_context=list(result.matched_context),
        order=result.order,
        training_tokens=local_model.training_tokens,
        note="Local n-gram model trained from checked-in site corpus. No external model API calls.",
    )

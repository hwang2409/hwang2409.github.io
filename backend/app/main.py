from __future__ import annotations

import os
import re
import time
from math import log2
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


APP_VERSION = "0.1.1"
TOKEN_PATTERN = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d+(?:\.\d+)?|[^\w\s]")
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


def _entropy(scores: list[float]) -> float:
    return -sum(score * log2(score) for score in scores if score > 0)


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
    note: str


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

    if last in {"cuda", "gpu", "kernel", "kernels"}:
        base = [("memory", 0.31), ("transfer", 0.22), ("launch", 0.17), ("latency", 0.12), ("tensor", 0.08)]
    elif last in {"model", "models", "inference"}:
        base = [("weights", 0.29), ("runtime", 0.21), ("export", 0.16), ("browser", 0.12), ("latency", 0.09)]
    elif last in {"sqlite", "database", "db"}:
        base = [("wal", 0.28), ("migration", 0.19), ("query", 0.17), ("connection", 0.12), ("backup", 0.1)]
    else:
        base = [("system", 0.24), ("context", 0.2), ("state", 0.16), ("model", 0.12), ("data", 0.1)]

    predictions = [TokenPrediction(token=token, score=score) for token, score in base[: request.top_k]]
    latency_ms = (time.perf_counter() - started) * 1_000

    return NextTokenResponse(
        model="local-placeholder-v0",
        predictions=predictions,
        entropy_bits=round(_entropy([prediction.score for prediction in predictions]), 3),
        latency_ms=round(latency_ms, 3),
        context_chars=len(request.context),
        last_token=last,
        note="Infrastructure stub. Replace with a real local model or provider-backed scorer later.",
    )

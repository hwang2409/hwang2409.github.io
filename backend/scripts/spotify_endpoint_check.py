#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "httpx2[http2,brotli,zstd]==2.4.0",
#     "pydantic==2.13.4",
#     "rich==14.2.0",
#     "typer==0.20.0",
# ]
# ///

# --- How to run ---
# 1. Check a local backend:
#      uv run backend/scripts/spotify_endpoint_check.py --base-url http://127.0.0.1:8000 --allow-unavailable
# ------------------

from __future__ import annotations

import socket
from dataclasses import dataclass
from typing import Annotated, Final, Literal, assert_never

import httpx2
import typer
from pydantic import BaseModel, ConfigDict
from rich.console import Console


DEFAULT_BASE_URL: Final = "http://127.0.0.1:8000"
SpotifyStatsStatus = Literal["ok", "not_configured", "reauthorization_required"]
SpotifyPlaybackKind = Literal["current", "recent", "empty"]

_LIMITS: Final = httpx2.Limits(
    max_connections=200,
    max_keepalive_connections=40,
    keepalive_expiry=30.0,
)
_TIMEOUT: Final = httpx2.Timeout(connect=5.0, read=30.0, write=10.0, pool=10.0)
_SOCKET_OPTIONS: Final[tuple[tuple[int, int, int], ...]] = (
    (socket.IPPROTO_TCP, socket.TCP_NODELAY, 1),
)

CONSOLE: Final = Console()


@dataclass(frozen=True, slots=True)
class SpotifyEndpointError(Exception):
    url: str
    status_code: int

    def __str__(self) -> str:
        return f"{self.url} returned HTTP {self.status_code}."


class SpotifyStatsProbe(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: SpotifyStatsStatus
    configured: bool
    note: str


class SpotifyNowProbe(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: SpotifyStatsStatus
    configured: bool
    playback_kind: SpotifyPlaybackKind
    note: str


def stats_url(base_url: str) -> str:
    return f"{base_url.rstrip('/')}/spotify/stats"


def now_url(base_url: str) -> str:
    return f"{base_url.rstrip('/')}/spotify/now"


def create_client() -> httpx2.Client:
    transport = httpx2.HTTPTransport(
        http2=True,
        retries=3,
        limits=_LIMITS,
        socket_options=_SOCKET_OPTIONS,
    )
    return httpx2.Client(
        transport=transport,
        timeout=_TIMEOUT,
        follow_redirects=True,
    )


def fetch_stats(client: httpx2.Client, url: str) -> SpotifyStatsProbe:
    response = client.get(url, headers={"Accept": "application/json"})
    try:
        response.raise_for_status()
    except httpx2.HTTPStatusError as error:
        raise SpotifyEndpointError(
            url=url,
            status_code=error.response.status_code,
        ) from error

    return SpotifyStatsProbe.model_validate(response.json())


def fetch_now(client: httpx2.Client, url: str) -> SpotifyNowProbe:
    response = client.get(url, headers={"Accept": "application/json"})
    try:
        response.raise_for_status()
    except httpx2.HTTPStatusError as error:
        raise SpotifyEndpointError(
            url=url,
            status_code=error.response.status_code,
        ) from error

    return SpotifyNowProbe.model_validate(response.json())


def status_message(label: str, status: SpotifyStatsStatus) -> str:
    match status:
        case "ok":
            return f"Spotify {label} is live."
        case "not_configured":
            return f"Spotify {label} is not configured on this backend."
        case "reauthorization_required":
            return f"Spotify {label} authorization needs refreshing."
        case unreachable:
            assert_never(unreachable)


def fetch_spotify(client: httpx2.Client, base_url: str) -> tuple[SpotifyStatsProbe, SpotifyNowProbe]:
    try:
        return (
            fetch_stats(client, stats_url(base_url)),
            fetch_now(client, now_url(base_url)),
        )
    except SpotifyEndpointError as error:
        CONSOLE.print(str(error))
        raise typer.Exit(1) from error


def main(
    base_url: Annotated[
        str,
        typer.Option(help="Backend base URL to check."),
    ] = DEFAULT_BASE_URL,
    require_ok: Annotated[
        bool,
        typer.Option(
            "--require-ok/--allow-unavailable",
            help="Fail unless the endpoint reports live Spotify stats.",
        ),
    ] = True,
) -> None:
    try:
        with create_client() as client:
            stats, now = fetch_spotify(client, base_url)
    except httpx2.RequestError as error:
        CONSOLE.print(f"{base_url.rstrip('/')} request failed: {error.__class__.__name__}")
        raise typer.Exit(1) from error
    except ValueError as error:
        CONSOLE.print(f"{base_url.rstrip('/')} returned an unexpected payload.")
        raise typer.Exit(1) from error

    CONSOLE.print(f"base_url={base_url.rstrip('/')}")
    CONSOLE.print(status_message("stats", stats.status))
    CONSOLE.print(f"stats_status={stats.status}")
    CONSOLE.print(f"stats_configured={stats.configured}")
    CONSOLE.print(stats.note)
    CONSOLE.print(status_message("now", now.status))
    CONSOLE.print(f"now_status={now.status}")
    CONSOLE.print(f"now_configured={now.configured}")
    CONSOLE.print(f"now_playback_kind={now.playback_kind}")
    CONSOLE.print(now.note)

    if require_ok and (stats.status != "ok" or now.status != "ok"):
        raise typer.Exit(1)


if __name__ == "__main__":
    typer.run(main)

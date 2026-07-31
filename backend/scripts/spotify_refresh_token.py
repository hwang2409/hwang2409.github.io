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
# 1. Install uv (if not installed):
#      curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Export Spotify app credentials:
#      export SPOTIFY_CLIENT_ID=...
#      export SPOTIFY_CLIENT_SECRET=...
# 3. Print the approval URL:
#      uv run backend/scripts/spotify_refresh_token.py
# 4. After approving, copy the full redirected URL or the code query parameter:
#      uv run backend/scripts/spotify_refresh_token.py --code <REDIRECTED_URL_OR_CODE>
# ------------------

from __future__ import annotations

import base64
import os
import secrets
import socket
import sys
from dataclasses import dataclass
from typing import Annotated, Final
from urllib.parse import parse_qs, urlencode, urlparse

import httpx2
import typer
from pydantic import BaseModel, ConfigDict
from rich.console import Console


SPOTIFY_AUTHORIZE_URL: Final = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL: Final = "https://accounts.spotify.com/api/token"
DEFAULT_REDIRECT_URI: Final = "http://127.0.0.1:8888/callback"
SPOTIFY_SCOPE: Final = (
    "user-top-read user-read-currently-playing user-read-recently-played"
)

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
class SpotifySetupConfig:
    client_id: str
    client_secret: str
    redirect_uri: str


@dataclass(frozen=True, slots=True)
class SpotifySetupError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


class SpotifyTokenResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    access_token: str
    token_type: str
    scope: str
    expires_in: int
    refresh_token: str | None = None


def load_config(redirect_uri: str) -> SpotifySetupConfig:
    client_id = os.getenv("SPOTIFY_CLIENT_ID", "").strip()
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "").strip()

    if not client_id or not client_secret:
        raise SpotifySetupError(
            "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET before running this helper."
        )

    return SpotifySetupConfig(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
    )


def authorization_header(config: SpotifySetupConfig) -> str:
    raw = f"{config.client_id}:{config.client_secret}".encode("utf-8")
    encoded = base64.b64encode(raw).decode("ascii")
    return f"Basic {encoded}"


def authorization_url(config: SpotifySetupConfig, state: str) -> str:
    query = urlencode(
        {
            "client_id": config.client_id,
            "response_type": "code",
            "redirect_uri": config.redirect_uri,
            "scope": SPOTIFY_SCOPE,
            "state": state,
            "show_dialog": "true",
        }
    )
    return f"{SPOTIFY_AUTHORIZE_URL}?{query}"


def authorization_code(raw_value: str) -> str:
    value = raw_value.strip()
    if not value.startswith(("http://", "https://")):
        return value

    parsed = urlparse(value)
    query = parse_qs(parsed.query)
    errors = query.get("error", ())
    if errors:
        raise SpotifySetupError(f"Spotify redirected with error={errors[0]}.")

    codes = query.get("code", ())
    if not codes:
        raise SpotifySetupError("Redirected URL did not include a code query parameter.")

    return codes[0]


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


def exchange_code(
    client: httpx2.Client,
    config: SpotifySetupConfig,
    code: str,
) -> SpotifyTokenResponse:
    response = client.post(
        SPOTIFY_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": authorization_code(code),
            "redirect_uri": config.redirect_uri,
        },
        headers={
            "Authorization": authorization_header(config),
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        response.raise_for_status()
    except httpx2.HTTPStatusError as error:
        raise SpotifySetupError(
            f"Spotify token exchange failed with HTTP {error.response.status_code}."
        ) from error

    token = SpotifyTokenResponse.model_validate(response.json())
    if token.refresh_token is None:
        raise SpotifySetupError(
            "Spotify did not return a refresh token. Re-run the approval URL and approve access again."
        )

    return token


def print_authorization_step(config: SpotifySetupConfig, state: str) -> None:
    CONSOLE.print("Open this URL, approve access, then copy the redirected URL or code:")
    sys.stdout.write(f"{authorization_url(config, state)}\n")
    CONSOLE.print("")
    CONSOLE.print("Expected redirect URI registered in Spotify:")
    CONSOLE.print(config.redirect_uri)
    CONSOLE.print("")
    CONSOLE.print("Keep the returned state value for your own sanity check:")
    CONSOLE.print(state)


def print_token_step(token: SpotifyTokenResponse) -> None:
    CONSOLE.print("Set this on the backend or Railway service:")
    CONSOLE.print(f"SPOTIFY_REFRESH_TOKEN={token.refresh_token}")
    CONSOLE.print("")
    CONSOLE.print("Keep these already-set variables with it:")
    CONSOLE.print("SPOTIFY_CLIENT_ID=<your Spotify app client id>")
    CONSOLE.print("SPOTIFY_CLIENT_SECRET=<your Spotify app client secret>")


def main(
    code: Annotated[
        str | None,
        typer.Option(help="Authorization code or full redirected URL from Spotify."),
    ] = None,
    redirect_uri: Annotated[
        str,
        typer.Option(help="Redirect URI registered in the Spotify Developer Dashboard."),
    ] = DEFAULT_REDIRECT_URI,
    state: Annotated[
        str | None,
        typer.Option(help="Optional OAuth state. Generated when omitted."),
    ] = None,
) -> None:
    try:
        config = load_config(redirect_uri)
        oauth_state = state or secrets.token_urlsafe(16)

        if code is None:
            print_authorization_step(config, oauth_state)
            raise typer.Exit(0)

        with create_client() as client:
            token = exchange_code(client, config, code)
        print_token_step(token)
    except SpotifySetupError as error:
        CONSOLE.print(str(error))
        raise typer.Exit(1) from error


if __name__ == "__main__":
    typer.run(main)

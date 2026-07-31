from __future__ import annotations

import base64
from dataclasses import dataclass

import httpx2

from app.spotify_models import SpotifyTokenErrorResponse, SpotifyTokenResponse


@dataclass(frozen=True, slots=True)
class SpotifyCredentials:
    client_id: str
    client_secret: str
    refresh_token: str


@dataclass(frozen=True, slots=True)
class SpotifyApiError(Exception):
    operation: str
    detail: str

    def __str__(self) -> str:
        return f"Spotify {self.operation} failed: {self.detail}"


@dataclass(frozen=True, slots=True)
class SpotifyReauthorizationRequired(Exception):
    detail: str

    def __str__(self) -> str:
        return f"Spotify reauthorization required: {self.detail}"


def authorization_header(credentials: SpotifyCredentials) -> str:
    raw = f"{credentials.client_id}:{credentials.client_secret}".encode("utf-8")
    encoded = base64.b64encode(raw).decode("ascii")
    return f"Basic {encoded}"


def token_error(response: httpx2.Response) -> SpotifyTokenErrorResponse | None:
    try:
        return SpotifyTokenErrorResponse.model_validate(response.json())
    except ValueError:
        return None


def refresh_access_token(
    client: httpx2.Client,
    credentials: SpotifyCredentials,
    token_url: str,
) -> SpotifyTokenResponse:
    response = client.post(
        token_url,
        data={
            "grant_type": "refresh_token",
            "refresh_token": credentials.refresh_token,
        },
        headers={
            "Authorization": authorization_header(credentials),
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        response.raise_for_status()
    except httpx2.HTTPStatusError as error:
        parsed_error = token_error(error.response)
        if parsed_error is not None and parsed_error.error == "invalid_grant":
            raise SpotifyReauthorizationRequired(
                detail=parsed_error.error_description
                or "refresh token expired or was revoked",
            ) from error

        raise SpotifyApiError(
            operation="token refresh",
            detail=f"HTTP {error.response.status_code}",
        ) from error

    return SpotifyTokenResponse.model_validate(response.json())

from __future__ import annotations

from datetime import UTC, datetime
from typing import Final

import httpx2

from app.spotify_auth import SpotifyApiError, SpotifyReauthorizationRequired
from app.spotify_models import (
    PublicSpotifyPlaybackTrack,
    SpotifyCurrentlyPlayingResponse,
    SpotifyImage,
    SpotifyNowResponse,
    SpotifyPlaybackKind,
    SpotifyPlaybackTrackItem,
    SpotifyRecentlyPlayedItem,
    SpotifyRecentlyPlayedPage,
)


CURRENTLY_PLAYING_PATH: Final = "/me/player/currently-playing"
RECENTLY_PLAYED_PATH: Final = "/me/player/recently-played"


def not_configured_now_response() -> SpotifyNowResponse:
    return SpotifyNowResponse(
        status="not_configured",
        configured=False,
        generated_at=datetime.now(UTC).isoformat(),
        playback_kind="empty",
        track=None,
        note="Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN to enable Spotify playback.",
    )


def reauthorization_required_now_response() -> SpotifyNowResponse:
    return SpotifyNowResponse(
        status="reauthorization_required",
        configured=False,
        generated_at=datetime.now(UTC).isoformat(),
        playback_kind="empty",
        track=None,
        note="Spotify authorization needs user-read-currently-playing and user-read-recently-played. Generate a new SPOTIFY_REFRESH_TOKEN.",
    )


def spotify_now_response(
    client: httpx2.Client,
    api_url: str,
    access_token: str,
) -> SpotifyNowResponse:
    current = _current_track(client, api_url, access_token)
    if current is not None:
        return _ok_now_response(
            playback_kind="current",
            track=_public_playback_track(
                current.item,
                is_playing=True,
                played_at=None,
            ),
            note="Current Spotify playback is read from Spotify Web API. Tokens stay on the backend.",
        )

    recent = _recent_track(client, api_url, access_token)
    if recent is not None:
        return _ok_now_response(
            playback_kind="recent",
            track=_public_playback_track(
                recent.track,
                is_playing=False,
                played_at=recent.played_at,
            ),
            note="No active Spotify playback; showing the latest recently played track.",
        )

    return _ok_now_response(
        playback_kind="empty",
        track=None,
        note="Spotify returned no active playback or recent tracks.",
    )


def _ok_now_response(
    playback_kind: SpotifyPlaybackKind,
    track: PublicSpotifyPlaybackTrack | None,
    note: str,
) -> SpotifyNowResponse:
    return SpotifyNowResponse(
        status="ok",
        configured=True,
        generated_at=datetime.now(UTC).isoformat(),
        playback_kind=playback_kind,
        track=track,
        note=note,
    )


def _current_track(
    client: httpx2.Client,
    api_url: str,
    access_token: str,
) -> SpotifyCurrentlyPlayingResponse | None:
    response = client.get(
        f"{api_url}{CURRENTLY_PLAYING_PATH}",
        headers=_auth_headers(access_token),
    )
    if response.status_code == 204:
        return None

    _raise_for_spotify_status(response, "current playback")
    payload = response.json()
    if _item_type(payload) != "track":
        return None

    try:
        current = SpotifyCurrentlyPlayingResponse.model_validate(payload)
    except ValueError as error:
        raise SpotifyApiError(
            operation="current playback",
            detail="unexpected payload",
        ) from error

    if not current.is_playing or current.item is None:
        return None

    return current


def _recent_track(
    client: httpx2.Client,
    api_url: str,
    access_token: str,
) -> SpotifyRecentlyPlayedItem | None:
    response = client.get(
        f"{api_url}{RECENTLY_PLAYED_PATH}",
        params={"limit": 1},
        headers=_auth_headers(access_token),
    )
    _raise_for_spotify_status(response, "recent playback")

    try:
        page = SpotifyRecentlyPlayedPage.model_validate(response.json())
    except ValueError as error:
        raise SpotifyApiError(
            operation="recent playback",
            detail="unexpected payload",
        ) from error

    return page.items[0] if page.items else None


def _public_playback_track(
    item: SpotifyPlaybackTrackItem,
    is_playing: bool,
    played_at: str | None,
) -> PublicSpotifyPlaybackTrack:
    return PublicSpotifyPlaybackTrack(
        title=item.name,
        artists=tuple(artist.name for artist in item.artists),
        album=item.album.name,
        url=item.external_urls.spotify,
        image_url=_first_image_url(item.album.images),
        played_at=played_at,
        is_playing=is_playing,
    )


def _first_image_url(images: tuple[SpotifyImage, ...]) -> str | None:
    if images:
        return images[0].url
    return None


def _auth_headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def _raise_for_spotify_status(response: httpx2.Response, operation: str) -> None:
    try:
        response.raise_for_status()
    except httpx2.HTTPStatusError as error:
        if error.response.status_code in {401, 403}:
            raise SpotifyReauthorizationRequired(
                detail=f"{operation} requires refreshed Spotify playback scopes",
            ) from error

        raise SpotifyApiError(
            operation=operation,
            detail=f"HTTP {error.response.status_code}",
        ) from error


def _item_type(payload) -> str | None:
    if not isinstance(payload, dict):
        return None

    item = payload.get("item")
    if not isinstance(item, dict):
        return None

    item_type = item.get("type")
    if isinstance(item_type, str):
        return item_type

    return None

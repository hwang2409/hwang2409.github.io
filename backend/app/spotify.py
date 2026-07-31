from __future__ import annotations

import hashlib
import os
import socket
from collections import Counter
from datetime import UTC, datetime
from typing import Final

import httpx2
from fastapi import APIRouter, HTTPException, status

from app.spotify_auth import (
    SpotifyApiError,
    SpotifyCredentials,
    SpotifyReauthorizationRequired,
    refresh_access_token,
)
from app.spotify_cache import SPOTIFY_NOW_CACHE, SPOTIFY_STATS_CACHE, SpotifyStatsCacheKey
from app.spotify_models import (
    PublicSpotifyArtist,
    PublicSpotifyTrack,
    SpotifyImage,
    SpotifyInsightsResponse,
    SpotifyNowResponse,
    SpotifyStatsResponse,
    SpotifyTopArtistItem,
    SpotifyTopArtistsPage,
    SpotifyTopTracksPage,
    TimeRange,
)
from app.spotify_playback import (
    not_configured_now_response,
    reauthorization_required_now_response,
    spotify_now_response,
)
from app.spotify_history import (
    not_configured_insights_response,
    observe_spotify_playback,
    reauthorization_required_insights_response,
    spotify_insights_response,
)


SPOTIFY_TOKEN_URL: Final = "https://accounts.spotify.com/api/token"
SPOTIFY_API_URL: Final = "https://api.spotify.com/v1"
SPOTIFY_TIME_RANGE: Final[TimeRange] = "medium_term"
SPOTIFY_ITEM_LIMIT: Final = 5

_LIMITS: Final = httpx2.Limits(
    max_connections=200,
    max_keepalive_connections=40,
    keepalive_expiry=30.0,
)
_TIMEOUT: Final = httpx2.Timeout(connect=5.0, read=30.0, write=10.0, pool=10.0)
_SOCKET_OPTIONS: Final[tuple[tuple[int, int, int], ...]] = (
    (socket.IPPROTO_TCP, socket.TCP_NODELAY, 1),
)


router = APIRouter(prefix="/spotify", tags=["spotify"])


def _load_credentials() -> SpotifyCredentials | None:
    client_id = os.getenv("SPOTIFY_CLIENT_ID", "").strip()
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "").strip()
    refresh_token = os.getenv("SPOTIFY_REFRESH_TOKEN", "").strip()

    if client_id and client_secret and refresh_token:
        return SpotifyCredentials(
            client_id=client_id,
            client_secret=client_secret,
            refresh_token=refresh_token,
        )

    return None


def _create_http_client() -> httpx2.Client:
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


def _credentials_cache_key(credentials: SpotifyCredentials) -> SpotifyStatsCacheKey:
    raw = (
        f"{credentials.client_id}:{credentials.client_secret}:"
        f"{credentials.refresh_token}"
    ).encode("utf-8")
    return SpotifyStatsCacheKey(hashlib.sha256(raw).hexdigest())


def _get_top_tracks(client: httpx2.Client, access_token: str) -> SpotifyTopTracksPage:
    response = client.get(
        f"{SPOTIFY_API_URL}/me/top/tracks",
        params={"time_range": SPOTIFY_TIME_RANGE, "limit": SPOTIFY_ITEM_LIMIT},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    try:
        response.raise_for_status()
    except httpx2.HTTPStatusError as error:
        raise SpotifyApiError(
            operation="top tracks",
            detail=f"HTTP {error.response.status_code}",
        ) from error

    return SpotifyTopTracksPage.model_validate(response.json())


def _get_top_artists(client: httpx2.Client, access_token: str) -> SpotifyTopArtistsPage:
    response = client.get(
        f"{SPOTIFY_API_URL}/me/top/artists",
        params={"time_range": SPOTIFY_TIME_RANGE, "limit": SPOTIFY_ITEM_LIMIT},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    try:
        response.raise_for_status()
    except httpx2.HTTPStatusError as error:
        raise SpotifyApiError(
            operation="top artists",
            detail=f"HTTP {error.response.status_code}",
        ) from error

    return SpotifyTopArtistsPage.model_validate(response.json())


def _first_image_url(images: tuple[SpotifyImage, ...]) -> str | None:
    if images:
        return images[0].url
    return None


def _public_tracks(page: SpotifyTopTracksPage) -> tuple[PublicSpotifyTrack, ...]:
    return tuple(
        PublicSpotifyTrack(
            rank=index,
            title=item.name,
            artists=tuple(artist.name for artist in item.artists),
            album=item.album.name,
            url=item.external_urls.spotify,
            image_url=_first_image_url(item.album.images),
        )
        for index, item in enumerate(page.items, start=1)
    )


def _public_artists(page: SpotifyTopArtistsPage) -> tuple[PublicSpotifyArtist, ...]:
    return tuple(
        PublicSpotifyArtist(
            rank=index,
            name=item.name,
            genres=item.genres[:3],
            url=item.external_urls.spotify,
            image_url=_first_image_url(item.images),
        )
        for index, item in enumerate(page.items, start=1)
    )


def _top_genres(artists: tuple[SpotifyTopArtistItem, ...]) -> tuple[str, ...]:
    genre_counts: Counter[str] = Counter(
        genre
        for artist in artists
        for genre in artist.genres
    )
    return tuple(genre for genre, _ in genre_counts.most_common(5))


def _not_configured_response() -> SpotifyStatsResponse:
    return SpotifyStatsResponse(
        status="not_configured",
        configured=False,
        generated_at=datetime.now(UTC).isoformat(),
        time_range=SPOTIFY_TIME_RANGE,
        time_range_label="last 6 months",
        top_tracks=(),
        top_artists=(),
        top_genres=(),
        note="Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN to enable Spotify stats.",
    )


def _reauthorization_required_response() -> SpotifyStatsResponse:
    return SpotifyStatsResponse(
        status="reauthorization_required",
        configured=False,
        generated_at=datetime.now(UTC).isoformat(),
        time_range=SPOTIFY_TIME_RANGE,
        time_range_label="last 6 months",
        top_tracks=(),
        top_artists=(),
        top_genres=(),
        note="Spotify refresh token expired or was revoked. Generate and deploy a new SPOTIFY_REFRESH_TOKEN.",
    )


@router.get("/now", response_model=SpotifyNowResponse)
def spotify_now() -> SpotifyNowResponse:
    credentials = _load_credentials()
    if credentials is None:
        return not_configured_now_response()

    cache_key = _credentials_cache_key(credentials)
    cached_response = SPOTIFY_NOW_CACHE.get(cache_key)
    if cached_response is not None:
        return cached_response

    try:
        with _create_http_client() as client:
            token = refresh_access_token(client, credentials, SPOTIFY_TOKEN_URL)
            response = spotify_now_response(client, SPOTIFY_API_URL, token.access_token)
    except httpx2.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Spotify request failed: {error.__class__.__name__}",
        ) from error
    except SpotifyReauthorizationRequired:
        return reauthorization_required_now_response()
    except SpotifyApiError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    return SPOTIFY_NOW_CACHE.remember(cache_key, response)


@router.get("/stats", response_model=SpotifyStatsResponse)
def spotify_stats() -> SpotifyStatsResponse:
    credentials = _load_credentials()
    if credentials is None:
        return _not_configured_response()

    cache_key = _credentials_cache_key(credentials)
    cached_response = SPOTIFY_STATS_CACHE.get(cache_key)
    if cached_response is not None:
        return cached_response

    try:
        with _create_http_client() as client:
            token = refresh_access_token(client, credentials, SPOTIFY_TOKEN_URL)
            tracks = _get_top_tracks(client, token.access_token)
            artists = _get_top_artists(client, token.access_token)
    except httpx2.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Spotify request failed: {error.__class__.__name__}",
        ) from error
    except SpotifyReauthorizationRequired:
        return _reauthorization_required_response()
    except SpotifyApiError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    response = SpotifyStatsResponse(
        status="ok",
        configured=True,
        generated_at=datetime.now(UTC).isoformat(),
        time_range=SPOTIFY_TIME_RANGE,
        time_range_label="last 6 months",
        top_tracks=_public_tracks(tracks),
        top_artists=_public_artists(artists),
        top_genres=_top_genres(artists.items),
        note="Top tracks and artists are read from Spotify Web API with user-top-read. Tokens stay on the backend.",
    )
    return SPOTIFY_STATS_CACHE.remember(cache_key, response)


@router.get("/insights", response_model=SpotifyInsightsResponse)
def spotify_insights() -> SpotifyInsightsResponse:
    credentials = _load_credentials()
    if credentials is None:
        return not_configured_insights_response()

    return spotify_insights_response()


@router.post("/observe", response_model=SpotifyInsightsResponse)
def spotify_observe() -> SpotifyInsightsResponse:
    credentials = _load_credentials()
    if credentials is None:
        return not_configured_insights_response()

    try:
        with _create_http_client() as client:
            token = refresh_access_token(client, credentials, SPOTIFY_TOKEN_URL)
            return observe_spotify_playback(client, SPOTIFY_API_URL, token.access_token)
    except httpx2.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Spotify request failed: {error.__class__.__name__}",
        ) from error
    except SpotifyReauthorizationRequired:
        return reauthorization_required_insights_response()
    except SpotifyApiError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

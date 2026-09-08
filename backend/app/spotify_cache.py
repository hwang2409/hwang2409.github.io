from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from typing import Final, Generic, NewType, TypeVar

from app.spotify_models import SpotifyNowResponse, SpotifyStatsResponse


SpotifyStatsCacheKey = NewType("SpotifyStatsCacheKey", str)
SpotifyNowCacheKey = NewType("SpotifyNowCacheKey", str)
SpotifyResponse = TypeVar("SpotifyResponse", SpotifyStatsResponse, SpotifyNowResponse)

DEFAULT_SPOTIFY_CACHE_SECONDS: Final = 1_800.0
# Playback changes faster than the stats endpoints. Keep it live by default.
DEFAULT_SPOTIFY_NOW_CACHE_SECONDS: Final = 0.0


@dataclass(frozen=True, slots=True)
class CachedSpotifyResponse(Generic[SpotifyResponse]):
    cache_key: str
    response: SpotifyResponse
    expires_at: float


@dataclass(slots=True)  # noqa: MUTABLE_OK
class SpotifyResponseCache(Generic[SpotifyResponse]):
    """Mutable in-process cache holder for public Spotify responses."""

    ttl_seconds: float
    entries: dict[str, CachedSpotifyResponse[SpotifyResponse]] = field(default_factory=dict)

    def get(self, cache_key: str) -> SpotifyResponse | None:
        if self.ttl_seconds <= 0:
            self.entries.clear()
            return None

        entry = self.entries.get(cache_key)
        if entry is None:
            return None

        if entry.cache_key != cache_key:
            return None

        if time.monotonic() < entry.expires_at:
            return entry.response

        self.entries.pop(cache_key, None)
        return None

    def remember(
        self,
        cache_key: str,
        response: SpotifyResponse,
    ) -> SpotifyResponse:
        if self.ttl_seconds <= 0:
            self.entries.clear()
            return response

        self.entries[cache_key] = CachedSpotifyResponse(
            cache_key=cache_key,
            response=response,
            expires_at=time.monotonic() + self.ttl_seconds,
        )
        return response


def _cache_ttl_seconds(env_name: str, default_seconds: float) -> float:
    raw = os.getenv(env_name, "").strip()
    if not raw:
        return default_seconds

    try:
        seconds = float(raw)
    except ValueError:
        return default_seconds

    if seconds <= 0:
        return 0.0

    return seconds


SPOTIFY_STATS_CACHE: Final = SpotifyResponseCache[SpotifyStatsResponse](
    ttl_seconds=_cache_ttl_seconds(
        "SPOTIFY_CACHE_SECONDS",
        DEFAULT_SPOTIFY_CACHE_SECONDS,
    ),
)
SPOTIFY_NOW_CACHE: Final = SpotifyResponseCache[SpotifyNowResponse](
    ttl_seconds=_cache_ttl_seconds(
        "SPOTIFY_NOW_CACHE_SECONDS",
        DEFAULT_SPOTIFY_NOW_CACHE_SECONDS,
    ),
)

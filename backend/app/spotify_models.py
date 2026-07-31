from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


TimeRange = Literal["short_term", "medium_term", "long_term"]
SpotifyStatsStatus = Literal["ok", "not_configured", "reauthorization_required"]
SpotifyPlaybackKind = Literal["current", "recent", "empty"]


class SpotifyImage(BaseModel):
    model_config = ConfigDict(frozen=True)

    url: str
    height: int | None = None
    width: int | None = None


class SpotifyExternalUrls(BaseModel):
    model_config = ConfigDict(frozen=True)

    spotify: str | None = None


class SpotifyArtistSummary(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    external_urls: SpotifyExternalUrls = Field(default_factory=SpotifyExternalUrls)


class SpotifyAlbumSummary(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    images: tuple[SpotifyImage, ...] = Field(default_factory=tuple)


class SpotifyTopArtistItem(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    genres: tuple[str, ...] = Field(default_factory=tuple)
    images: tuple[SpotifyImage, ...] = Field(default_factory=tuple)
    external_urls: SpotifyExternalUrls = Field(default_factory=SpotifyExternalUrls)


class SpotifyTopTrackItem(BaseModel):
    model_config = ConfigDict(frozen=True)

    type: str | None = None
    name: str
    artists: tuple[SpotifyArtistSummary, ...]
    album: SpotifyAlbumSummary
    external_urls: SpotifyExternalUrls = Field(default_factory=SpotifyExternalUrls)


class SpotifyPlaybackTrackItem(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str | None = None
    type: str | None = None
    name: str
    duration_ms: int | None = None
    artists: tuple[SpotifyArtistSummary, ...]
    album: SpotifyAlbumSummary
    external_urls: SpotifyExternalUrls = Field(default_factory=SpotifyExternalUrls)


class SpotifyTopTracksPage(BaseModel):
    model_config = ConfigDict(frozen=True)

    items: tuple[SpotifyTopTrackItem, ...]


class SpotifyTopArtistsPage(BaseModel):
    model_config = ConfigDict(frozen=True)

    items: tuple[SpotifyTopArtistItem, ...]


class SpotifyCurrentlyPlayingResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    is_playing: bool = False
    progress_ms: int | None = None
    item: SpotifyPlaybackTrackItem | None = None


class SpotifyRecentlyPlayedItem(BaseModel):
    model_config = ConfigDict(frozen=True)

    track: SpotifyPlaybackTrackItem
    played_at: str


class SpotifyRecentlyPlayedPage(BaseModel):
    model_config = ConfigDict(frozen=True)

    items: tuple[SpotifyRecentlyPlayedItem, ...] = Field(default_factory=tuple)


class SpotifyTokenResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    access_token: str
    token_type: str
    expires_in: int


class SpotifyTokenErrorResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    error: str
    error_description: str | None = None


class PublicSpotifyTrack(BaseModel):
    model_config = ConfigDict(frozen=True)

    rank: int
    title: str
    artists: tuple[str, ...]
    album: str
    url: str | None
    image_url: str | None


class PublicSpotifyArtist(BaseModel):
    model_config = ConfigDict(frozen=True)

    rank: int
    name: str
    genres: tuple[str, ...]
    url: str | None
    image_url: str | None


class PublicSpotifyPlaybackTrack(BaseModel):
    model_config = ConfigDict(frozen=True)

    title: str
    artists: tuple[str, ...]
    album: str
    url: str | None
    image_url: str | None
    played_at: str | None
    is_playing: bool


class SpotifyStatsResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: SpotifyStatsStatus
    configured: bool
    generated_at: str
    time_range: TimeRange
    time_range_label: str
    top_tracks: tuple[PublicSpotifyTrack, ...]
    top_artists: tuple[PublicSpotifyArtist, ...]
    top_genres: tuple[str, ...]
    note: str


class SpotifyNowResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: SpotifyStatsStatus
    configured: bool
    generated_at: str
    playback_kind: SpotifyPlaybackKind
    track: PublicSpotifyPlaybackTrack | None
    note: str


class PublicSpotifyInsightTrack(BaseModel):
    model_config = ConfigDict(frozen=True)

    rank: int
    track_id: str
    title: str
    artists: tuple[str, ...]
    album: str
    url: str | None
    image_url: str | None
    plays: int
    completions: int
    skips: int
    completion_rate: float
    skip_rate: float
    average_skip_percent: float | None


class PublicSpotifyTimelineBucket(BaseModel):
    model_config = ConfigDict(frozen=True)

    index: int
    start_percent: int
    end_percent: int
    listens: int
    skips: int


class PublicSpotifyTimeline(BaseModel):
    model_config = ConfigDict(frozen=True)

    title: str
    artists: tuple[str, ...]
    album: str
    buckets: tuple[PublicSpotifyTimelineBucket, ...]


class PublicSpotifyInsightMetric(BaseModel):
    model_config = ConfigDict(frozen=True)

    label: str
    value: str
    note: str


class PublicSpotifyInsightSection(BaseModel):
    model_config = ConfigDict(frozen=True)

    title: str
    eyebrow: str
    metrics: tuple[PublicSpotifyInsightMetric, ...]


class SpotifyInsightsResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: SpotifyStatsStatus
    configured: bool
    generated_at: str
    observed_samples: int
    total_plays: int
    active_days: int
    top_played: tuple[PublicSpotifyInsightTrack, ...]
    skip_profile: tuple[PublicSpotifyInsightTrack, ...]
    timeline: PublicSpotifyTimeline | None
    sections: tuple[PublicSpotifyInsightSection, ...]
    note: str

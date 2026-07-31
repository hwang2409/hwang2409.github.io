from __future__ import annotations

import json
import os
import sqlite3
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Final

import httpx2

from app.spotify_auth import SpotifyApiError, SpotifyReauthorizationRequired
from app.spotify_models import (
    PublicSpotifyInsightMetric,
    PublicSpotifyInsightSection,
    PublicSpotifyInsightTrack,
    PublicSpotifyTimeline,
    PublicSpotifyTimelineBucket,
    SpotifyInsightsResponse,
    SpotifyStatsStatus,
)


CURRENTLY_PLAYING_PATH: Final = "/me/player/currently-playing"
DEFAULT_HISTORY_PATH: Final = Path(__file__).resolve().parent.parent / "data" / "spotify_history.sqlite3"
PLAY_GAP_SECONDS: Final = 20 * 60
REPLAY_REWIND_MS: Final = 20_000
COMPLETE_RATIO: Final = 0.85
SKIP_RATIO: Final = 0.70
TIMELINE_BUCKETS: Final = 20


@dataclass(frozen=True, slots=True)
class PlaybackObservation:
    observed_at: datetime
    track_id: str
    title: str
    artists: tuple[str, ...]
    album: str
    url: str | None
    image_url: str | None
    duration_ms: int
    progress_ms: int
    is_playing: bool


def not_configured_insights_response() -> SpotifyInsightsResponse:
    return _insights_response(
        status="not_configured",
        configured=False,
        note="Set Spotify credentials to collect local listening history.",
    )


def reauthorization_required_insights_response() -> SpotifyInsightsResponse:
    return _insights_response(
        status="reauthorization_required",
        configured=False,
        note="Spotify authorization needs playback scopes before listening history can be collected.",
    )


def spotify_insights_response() -> SpotifyInsightsResponse:
    ensure_history_db()
    return _insights_response(
        status="ok",
        configured=True,
        note="Insights come from local playback samples collected while this backend is running.",
    )


def observe_spotify_playback(
    client: httpx2.Client,
    api_url: str,
    access_token: str,
) -> SpotifyInsightsResponse:
    ensure_history_db()
    observation = _current_observation(client, api_url, access_token)
    record_observation(observation)
    return spotify_insights_response()


def record_observation(observation: PlaybackObservation | None) -> None:
    observed_at = datetime.now(UTC) if observation is None else observation.observed_at
    with _connect() as connection:
        open_play = _open_play(connection)
        if observation is None:
            if open_play is not None:
                _close_play(connection, open_play, observed_at)
            return

        _insert_snapshot(connection, observation)
        if open_play is None:
            _start_play(connection, observation)
            return

        if _continues_play(open_play, observation):
            _update_play(connection, open_play["id"], observation)
            return

        _close_play(connection, open_play, observation.observed_at)
        _start_play(connection, observation)


def ensure_history_db() -> None:
    path = _history_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS spotify_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                observed_at TEXT NOT NULL,
                track_id TEXT NOT NULL,
                title TEXT NOT NULL,
                artists_json TEXT NOT NULL,
                album TEXT NOT NULL,
                url TEXT,
                image_url TEXT,
                duration_ms INTEGER NOT NULL,
                progress_ms INTEGER NOT NULL,
                bucket_index INTEGER NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS spotify_plays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id TEXT NOT NULL,
                title TEXT NOT NULL,
                artists_json TEXT NOT NULL,
                album TEXT NOT NULL,
                url TEXT,
                image_url TEXT,
                duration_ms INTEGER NOT NULL,
                started_at TEXT NOT NULL,
                last_observed_at TEXT NOT NULL,
                ended_at TEXT,
                first_progress_ms INTEGER NOT NULL,
                max_progress_ms INTEGER NOT NULL,
                last_progress_ms INTEGER NOT NULL,
                sample_count INTEGER NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                skipped INTEGER NOT NULL DEFAULT 0,
                skip_progress_ms INTEGER
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS spotify_plays_started_idx ON spotify_plays(started_at)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS spotify_snapshots_track_idx ON spotify_snapshots(track_id)"
        )


def _insights_response(
    status: SpotifyStatsStatus,
    configured: bool,
    note: str,
) -> SpotifyInsightsResponse:
    summary = _history_summary() if status == "ok" else _empty_summary()
    return SpotifyInsightsResponse(
        status=status,
        configured=configured,
        generated_at=datetime.now(UTC).isoformat(),
        observed_samples=summary["observed_samples"],
        total_plays=summary["total_plays"],
        active_days=summary["active_days"],
        top_played=tuple(summary["top_played"]),
        skip_profile=tuple(summary["skip_profile"]),
        timeline=summary["timeline"],
        sections=tuple(summary["sections"]),
        note=note,
    )


def _history_summary() -> dict[str, Any]:
    with _connect() as connection:
        samples = _scalar(connection, "SELECT COUNT(*) FROM spotify_snapshots")
        plays = _play_rows(connection)

    top_tracks = _track_rollup(plays, skip_only=False)
    skip_profile = _track_rollup(plays, skip_only=True)
    return {
        "observed_samples": samples,
        "total_plays": len(plays),
        "active_days": _active_days(plays),
        "top_played": top_tracks[:5],
        "skip_profile": skip_profile[:5],
        "timeline": _timeline(top_tracks[0]) if top_tracks else None,
        "sections": _insight_sections(plays),
    }


def _empty_summary() -> dict[str, Any]:
    return {
        "observed_samples": 0,
        "total_plays": 0,
        "active_days": 0,
        "top_played": (),
        "skip_profile": (),
        "timeline": None,
        "sections": _empty_sections(),
    }


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(_history_path())
    connection.row_factory = sqlite3.Row
    return connection


def _history_path() -> Path:
    configured = os.getenv("SPOTIFY_HISTORY_DB", "").strip()
    return Path(configured) if configured else DEFAULT_HISTORY_PATH


def _current_observation(
    client: httpx2.Client,
    api_url: str,
    access_token: str,
) -> PlaybackObservation | None:
    response = client.get(
        f"{api_url}{CURRENTLY_PLAYING_PATH}",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if response.status_code == 204:
        return None

    try:
        response.raise_for_status()
    except httpx2.HTTPStatusError as error:
        if error.response.status_code in {401, 403}:
            raise SpotifyReauthorizationRequired(
                detail="current playback requires refreshed Spotify playback scopes",
            ) from error
        raise SpotifyApiError(
            operation="current playback observation",
            detail=f"HTTP {error.response.status_code}",
        ) from error

    payload = response.json()
    item = payload.get("item") if isinstance(payload, dict) else None
    if not isinstance(item, dict) or item.get("type") != "track":
        return None
    if payload.get("is_playing") is not True:
        return None

    track_id = _string(item.get("id"))
    duration_ms = _positive_int(item.get("duration_ms"))
    progress_ms = _positive_int(payload.get("progress_ms"))
    if track_id is None or duration_ms is None:
        return None

    return PlaybackObservation(
        observed_at=datetime.now(UTC),
        track_id=track_id,
        title=_string(item.get("name")) or "unknown track",
        artists=_artist_names(item),
        album=_album_name(item),
        url=_spotify_url(item),
        image_url=_image_url(item),
        duration_ms=duration_ms,
        progress_ms=min(progress_ms or 0, duration_ms),
        is_playing=True,
    )


def _insert_snapshot(connection: sqlite3.Connection, observation: PlaybackObservation) -> None:
    connection.execute(
        """
        INSERT INTO spotify_snapshots (
            observed_at, track_id, title, artists_json, album, url, image_url,
            duration_ms, progress_ms, bucket_index
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            observation.observed_at.isoformat(),
            observation.track_id,
            observation.title,
            json.dumps(observation.artists),
            observation.album,
            observation.url,
            observation.image_url,
            observation.duration_ms,
            observation.progress_ms,
            _bucket_index(observation.progress_ms, observation.duration_ms),
        ),
    )


def _start_play(connection: sqlite3.Connection, observation: PlaybackObservation) -> None:
    connection.execute(
        """
        INSERT INTO spotify_plays (
            track_id, title, artists_json, album, url, image_url, duration_ms,
            started_at, last_observed_at, first_progress_ms, max_progress_ms,
            last_progress_ms, sample_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """,
        (
            observation.track_id,
            observation.title,
            json.dumps(observation.artists),
            observation.album,
            observation.url,
            observation.image_url,
            observation.duration_ms,
            observation.observed_at.isoformat(),
            observation.observed_at.isoformat(),
            observation.progress_ms,
            observation.progress_ms,
            observation.progress_ms,
        ),
    )


def _update_play(
    connection: sqlite3.Connection,
    play_id: int,
    observation: PlaybackObservation,
) -> None:
    connection.execute(
        """
        UPDATE spotify_plays
        SET last_observed_at = ?,
            max_progress_ms = MAX(max_progress_ms, ?),
            last_progress_ms = ?,
            sample_count = sample_count + 1
        WHERE id = ?
        """,
        (
            observation.observed_at.isoformat(),
            observation.progress_ms,
            observation.progress_ms,
            play_id,
        ),
    )


def _close_play(
    connection: sqlite3.Connection,
    play: sqlite3.Row,
    ended_at: datetime,
) -> None:
    duration_ms = int(play["duration_ms"])
    max_progress_ms = int(play["max_progress_ms"])
    last_progress_ms = int(play["last_progress_ms"])
    completed = _is_completed(max_progress_ms, duration_ms)
    skipped = not completed and _progress_ratio(max_progress_ms, duration_ms) < SKIP_RATIO
    connection.execute(
        """
        UPDATE spotify_plays
        SET ended_at = ?,
            completed = ?,
            skipped = ?,
            skip_progress_ms = ?
        WHERE id = ?
        """,
        (
            ended_at.isoformat(),
            int(completed),
            int(skipped),
            last_progress_ms if skipped else None,
            play["id"],
        ),
    )


def _open_play(connection: sqlite3.Connection) -> sqlite3.Row | None:
    return connection.execute(
        "SELECT * FROM spotify_plays WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1"
    ).fetchone()


def _continues_play(play: sqlite3.Row, observation: PlaybackObservation) -> bool:
    if play["track_id"] != observation.track_id:
        return False

    last_observed = _parse_datetime(str(play["last_observed_at"]))
    if observation.observed_at - last_observed > timedelta(seconds=PLAY_GAP_SECONDS):
        return False

    last_progress_ms = int(play["last_progress_ms"])
    return observation.progress_ms + REPLAY_REWIND_MS >= last_progress_ms


def _track_rollup(
    plays: list[sqlite3.Row],
    *,
    skip_only: bool,
) -> tuple[PublicSpotifyInsightTrack, ...]:
    grouped: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for play in plays:
        if skip_only and int(play["skipped"]) != 1:
            continue
        grouped[str(play["track_id"])].append(play)

    ranked = sorted(
        grouped.values(),
        key=lambda rows: (
            sum(int(row["skipped"]) for row in rows) if skip_only else len(rows),
            len(rows),
            str(rows[-1]["last_observed_at"]),
        ),
        reverse=True,
    )
    return tuple(
        _insight_track(index, rows)
        for index, rows in enumerate(ranked[:5], start=1)
    )


def _insight_track(index: int, rows: list[sqlite3.Row]) -> PublicSpotifyInsightTrack:
    latest = rows[-1]
    plays = len(rows)
    completions = sum(int(row["completed"]) for row in rows)
    skips = sum(int(row["skipped"]) for row in rows)
    skip_percents = [
        _progress_ratio(int(row["skip_progress_ms"]), int(row["duration_ms"])) * 100
        for row in rows
        if row["skip_progress_ms"] is not None
    ]
    average_skip_percent = (
        round(sum(skip_percents) / len(skip_percents), 1)
        if skip_percents
        else None
    )
    return PublicSpotifyInsightTrack(
        rank=index,
        track_id=str(latest["track_id"]),
        title=str(latest["title"]),
        artists=_json_strings(str(latest["artists_json"])),
        album=str(latest["album"]),
        url=latest["url"],
        image_url=latest["image_url"],
        plays=plays,
        completions=completions,
        skips=skips,
        completion_rate=round(completions / plays, 3) if plays else 0.0,
        skip_rate=round(skips / plays, 3) if plays else 0.0,
        average_skip_percent=average_skip_percent,
    )


def _timeline(track: PublicSpotifyInsightTrack) -> PublicSpotifyTimeline:
    listens = [0] * TIMELINE_BUCKETS
    skips = [0] * TIMELINE_BUCKETS
    with _connect() as connection:
        for row in connection.execute(
            "SELECT bucket_index, COUNT(*) AS count FROM spotify_snapshots WHERE track_id = ? GROUP BY bucket_index",
            (track.track_id,),
        ):
            listens[int(row["bucket_index"])] = int(row["count"])
        for row in connection.execute(
            """
            SELECT skip_progress_ms, duration_ms
            FROM spotify_plays
            WHERE track_id = ? AND skipped = 1 AND skip_progress_ms IS NOT NULL
            """,
            (track.track_id,),
        ):
            skips[_bucket_index(int(row["skip_progress_ms"]), int(row["duration_ms"]))] += 1

    return PublicSpotifyTimeline(
        title=track.title,
        artists=track.artists,
        album=track.album,
        buckets=tuple(
            PublicSpotifyTimelineBucket(
                index=index,
                start_percent=index * 5,
                end_percent=(index + 1) * 5,
                listens=listens[index],
                skips=skips[index],
            )
            for index in range(TIMELINE_BUCKETS)
        ),
    )


def _insight_sections(plays: list[sqlite3.Row]) -> tuple[PublicSpotifyInsightSection, ...]:
    if not plays:
        return _empty_sections()

    return (
        PublicSpotifyInsightSection(
            title="rotation",
            eyebrow="obsession tracker",
            metrics=_rotation_metrics(plays),
        ),
        PublicSpotifyInsightSection(
            title="wrapped",
            eyebrow="always-on recap",
            metrics=_wrapped_metrics(plays),
        ),
        PublicSpotifyInsightSection(
            title="drift",
            eyebrow="taste movement",
            metrics=_drift_metrics(plays),
        ),
        PublicSpotifyInsightSection(
            title="sessions",
            eyebrow="listening shape",
            metrics=_session_metrics(plays),
        ),
        PublicSpotifyInsightSection(
            title="repeats",
            eyebrow="loop gravity",
            metrics=_repeat_metrics(plays),
        ),
        PublicSpotifyInsightSection(
            title="depth",
            eyebrow="artist catalog",
            metrics=_artist_depth_metrics(plays),
        ),
        PublicSpotifyInsightSection(
            title="albums",
            eyebrow="album integrity",
            metrics=_album_metrics(plays),
        ),
    )


def _empty_sections() -> tuple[PublicSpotifyInsightSection, ...]:
    empty = PublicSpotifyInsightMetric(
        label="collecting",
        value="0 plays",
        note="leave the music page open while Spotify is playing",
    )
    return tuple(
        PublicSpotifyInsightSection(title=title, eyebrow=eyebrow, metrics=(empty,))
        for title, eyebrow in (
            ("rotation", "obsession tracker"),
            ("wrapped", "always-on recap"),
            ("drift", "taste movement"),
            ("sessions", "listening shape"),
            ("repeats", "loop gravity"),
            ("depth", "artist catalog"),
            ("albums", "album integrity"),
        )
    )


def _rotation_metrics(plays: list[sqlite3.Row]) -> tuple[PublicSpotifyInsightMetric, ...]:
    recent = _plays_since(plays, datetime.now(UTC) - timedelta(days=7))
    recent_counts = Counter(str(play["title"]) for play in recent)
    top_recent = recent_counts.most_common(1)
    skip_candidates = _track_rollup(plays, skip_only=True)
    return (
        _metric("in rotation", _count_label(top_recent), "top track in the last 7 days"),
        _metric(
            "burnout watch",
            skip_candidates[0].title if skip_candidates else "none yet",
            "track with the most observed skips",
        ),
        _metric("active days", str(_active_days(plays)), "days with captured plays"),
    )


def _wrapped_metrics(plays: list[sqlite3.Row]) -> tuple[PublicSpotifyInsightMetric, ...]:
    top_tracks = _track_rollup(plays, skip_only=False)
    completions = sum(int(play["completed"]) for play in plays)
    skips = sum(int(play["skipped"]) for play in plays)
    return (
        _metric("top song", top_tracks[0].title if top_tracks else "none yet", "most captured plays"),
        _metric("finish rate", f"{round(completions / max(len(plays), 1) * 100)}%", "captured plays completed"),
        _metric("skip count", str(skips), "captured plays ended early"),
    )


def _drift_metrics(plays: list[sqlite3.Row]) -> tuple[PublicSpotifyInsightMetric, ...]:
    now = datetime.now(UTC)
    recent_artists = _artist_set(_plays_since(plays, now - timedelta(days=7)))
    prior = [
        play
        for play in plays
        if now - timedelta(days=37) <= _parse_datetime(str(play["started_at"])) < now - timedelta(days=7)
    ]
    prior_artists = _artist_set(prior)
    new_artists = recent_artists - prior_artists
    shared = recent_artists & prior_artists
    return (
        _metric("7d artists", str(len(recent_artists)), "distinct artists this week"),
        _metric("new to window", str(len(new_artists)), "artists not seen in the previous month"),
        _metric("carryover", str(len(shared)), "artists present in both windows"),
    )


def _session_metrics(plays: list[sqlite3.Row]) -> tuple[PublicSpotifyInsightMetric, ...]:
    sessions = _sessions(plays)
    longest = max((len(session) for session in sessions), default=0)
    average = round(sum(len(session) for session in sessions) / len(sessions), 1) if sessions else 0
    return (
        _metric("sessions", str(len(sessions)), "30 minute gaps split sessions"),
        _metric("longest", f"{longest} tracks", "largest captured session"),
        _metric("average", f"{average} tracks", "mean captured session length"),
    )


def _repeat_metrics(plays: list[sqlite3.Row]) -> tuple[PublicSpotifyInsightMetric, ...]:
    immediate = 0
    loop_counts: Counter[str] = Counter()
    for previous, current in zip(plays, plays[1:]):
        gap = _parse_datetime(str(current["started_at"])) - _parse_datetime(str(previous["last_observed_at"]))
        if previous["track_id"] == current["track_id"] and gap <= timedelta(minutes=10):
            immediate += 1
            loop_counts[str(current["title"])] += 1
    top_loop = loop_counts.most_common(1)
    return (
        _metric("immediate replays", str(immediate), "same track again within 10 minutes"),
        _metric("loopiest", _count_label(top_loop), "track with the most immediate replays"),
        _metric("repeat rate", f"{round(immediate / max(len(plays), 1) * 100)}%", "share of captured plays"),
    )


def _artist_depth_metrics(plays: list[sqlite3.Row]) -> tuple[PublicSpotifyInsightMetric, ...]:
    tracks_by_artist: dict[str, set[str]] = defaultdict(set)
    for play in plays:
        for artist in _json_strings(str(play["artists_json"])):
            tracks_by_artist[artist].add(str(play["track_id"]))
    deepest = sorted(tracks_by_artist.items(), key=lambda item: len(item[1]), reverse=True)
    one_track = sum(1 for tracks in tracks_by_artist.values() if len(tracks) == 1)
    return (
        _metric("deepest artist", _artist_depth_label(deepest), "distinct captured tracks"),
        _metric("artists", str(len(tracks_by_artist)), "distinct captured artists"),
        _metric("one-track artists", str(one_track), "artists represented by a single song"),
    )


def _album_metrics(plays: list[sqlite3.Row]) -> tuple[PublicSpotifyInsightMetric, ...]:
    album_counts = Counter(str(play["album"]) for play in plays)
    longest_run = 0
    current_album = None
    current_run = 0
    for play in plays:
        album = str(play["album"])
        if album == current_album:
            current_run += 1
        else:
            current_album = album
            current_run = 1
        longest_run = max(longest_run, current_run)
    return (
        _metric("most visited", _count_label(album_counts.most_common(1)), "album with most captured plays"),
        _metric("album run", f"{longest_run} tracks", "longest same-album streak"),
        _metric("albums", str(len(album_counts)), "distinct captured albums"),
    )


def _play_rows(connection: sqlite3.Connection) -> list[sqlite3.Row]:
    return list(connection.execute("SELECT * FROM spotify_plays ORDER BY started_at, id"))


def _scalar(connection: sqlite3.Connection, query: str) -> int:
    row = connection.execute(query).fetchone()
    return int(row[0]) if row is not None else 0


def _plays_since(plays: list[sqlite3.Row], since: datetime) -> list[sqlite3.Row]:
    return [
        play
        for play in plays
        if _parse_datetime(str(play["started_at"])) >= since
    ]


def _sessions(plays: list[sqlite3.Row]) -> list[list[sqlite3.Row]]:
    sessions: list[list[sqlite3.Row]] = []
    for play in plays:
        if not sessions:
            sessions.append([play])
            continue
        previous = sessions[-1][-1]
        gap = _parse_datetime(str(play["started_at"])) - _parse_datetime(str(previous["last_observed_at"]))
        if gap > timedelta(minutes=30):
            sessions.append([play])
        else:
            sessions[-1].append(play)
    return sessions


def _active_days(plays: list[sqlite3.Row]) -> int:
    return len({str(play["started_at"])[:10] for play in plays})


def _artist_set(plays: list[sqlite3.Row]) -> set[str]:
    return {
        artist
        for play in plays
        for artist in _json_strings(str(play["artists_json"]))
    }


def _metric(label: str, value: str, note: str) -> PublicSpotifyInsightMetric:
    return PublicSpotifyInsightMetric(label=label, value=value, note=note)


def _count_label(items: list[tuple[str, int]] | list[tuple[str, set[str]]]) -> str:
    if not items:
        return "none yet"
    name, count = items[0]
    if isinstance(count, set):
        return f"{name} ({len(count)})"
    return f"{name} ({count})"


def _artist_depth_label(items: list[tuple[str, set[str]]]) -> str:
    if not items:
        return "none yet"
    artist, tracks = items[0]
    return f"{artist} ({len(tracks)})"


def _bucket_index(progress_ms: int, duration_ms: int) -> int:
    if duration_ms <= 0:
        return 0
    index = int((progress_ms / duration_ms) * TIMELINE_BUCKETS)
    return max(0, min(TIMELINE_BUCKETS - 1, index))


def _is_completed(progress_ms: int, duration_ms: int) -> bool:
    if duration_ms <= 0:
        return False
    return progress_ms >= duration_ms * COMPLETE_RATIO or duration_ms - progress_ms <= 30_000


def _progress_ratio(progress_ms: int, duration_ms: int) -> float:
    return max(0.0, min(1.0, progress_ms / duration_ms)) if duration_ms > 0 else 0.0


def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _json_strings(value: str) -> tuple[str, ...]:
    try:
        parsed = json.loads(value)
    except ValueError:
        return ()
    if not isinstance(parsed, list):
        return ()
    return tuple(item for item in parsed if isinstance(item, str))


def _string(value: object) -> str | None:
    return value if isinstance(value, str) and value else None


def _positive_int(value: object) -> int | None:
    if isinstance(value, int) and value >= 0:
        return value
    return None


def _artist_names(item: dict[str, object]) -> tuple[str, ...]:
    artists = item.get("artists")
    if not isinstance(artists, list):
        return ()
    return tuple(
        artist["name"]
        for artist in artists
        if isinstance(artist, dict) and isinstance(artist.get("name"), str)
    )


def _album_name(item: dict[str, object]) -> str:
    album = item.get("album")
    if isinstance(album, dict) and isinstance(album.get("name"), str):
        return album["name"]
    return "unknown album"


def _spotify_url(item: dict[str, object]) -> str | None:
    external_urls = item.get("external_urls")
    if isinstance(external_urls, dict) and isinstance(external_urls.get("spotify"), str):
        return external_urls["spotify"]
    return None


def _image_url(item: dict[str, object]) -> str | None:
    album = item.get("album")
    if not isinstance(album, dict):
        return None
    images = album.get("images")
    if not isinstance(images, list) or not images:
        return None
    first = images[0]
    if isinstance(first, dict) and isinstance(first.get("url"), str):
        return first["url"]
    return None

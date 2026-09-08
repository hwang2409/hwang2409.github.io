from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date, timedelta
import os
import re
import socket
import threading
import time
from html.parser import HTMLParser
from typing import Final, Generic, Literal, TypeVar
from urllib.parse import quote

import httpx2
from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field


GithubActivityStatus = Literal["ok", "partial", "unavailable"]
GithubActivityValue = TypeVar("GithubActivityValue")

GITHUB_CONTRIBUTIONS_URL: Final = "https://github.com/users/hwang2409/contributions"
GITHUB_EVENTS_URL: Final = "https://api.github.com/users/hwang2409/events/public"
GITHUB_SEARCH_URL: Final = "https://api.github.com/search/issues"
GITHUB_USER_AGENT: Final = "hwang2409.github.io/1.0 (+https://github.com/hwang2409)"
DEFAULT_CONTRIBUTIONS_CACHE_SECONDS: Final = 3_600.0
DEFAULT_GITHUB_API_CACHE_SECONDS: Final = 600.0
DEFAULT_GITHUB_FAILURE_CACHE_SECONDS: Final = 60.0
MIN_CONTRIBUTION_DAYS: Final = 363
MAX_CONTRIBUTION_DAYS: Final = 373

_COUNT_PATTERN: Final = re.compile(r"\b([\d,]+)\s+contributions?\b", re.IGNORECASE)
_NO_CONTRIBUTIONS_PATTERN: Final = re.compile(r"^no contributions\b", re.IGNORECASE)
_LIMITS: Final = httpx2.Limits(
    max_connections=20,
    max_keepalive_connections=5,
    keepalive_expiry=30.0,
)
_TIMEOUT: Final = httpx2.Timeout(connect=5.0, read=20.0, write=10.0, pool=10.0)
_SOCKET_OPTIONS: Final[tuple[tuple[int, int, int], ...]] = (
    (socket.IPPROTO_TCP, socket.TCP_NODELAY, 1),
)


class GithubContributionDay(BaseModel):
    model_config = ConfigDict(frozen=True)

    date: str
    level: int = Field(ge=0, le=4)
    count: int = Field(ge=0)


class GithubLatestPush(BaseModel):
    model_config = ConfigDict(frozen=True)

    repo: str
    message: str
    pushed_at: str


class GithubActivityResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: GithubActivityStatus
    total_contributions: int | None
    weeks: tuple[tuple[GithubContributionDay, ...], ...] | None
    latest_push: GithubLatestPush | None
    open_prs: int | None


@dataclass(frozen=True, slots=True)
class _CacheEntry(Generic[GithubActivityValue]):
    value: GithubActivityValue
    expires_at: float


@dataclass(slots=True)
class _ResponseCache(Generic[GithubActivityValue]):
    ttl_seconds: float
    failure_ttl_seconds: float = DEFAULT_GITHUB_FAILURE_CACHE_SECONDS
    entry: _CacheEntry[GithubActivityValue] | None = None
    failure_expires_at: float | None = None
    fetching: bool = False
    condition: threading.Condition = field(default_factory=threading.Condition)

    def get_or_fetch(
        self,
        client: httpx2.Client,
        fetch: Callable[[httpx2.Client], GithubActivityValue],
    ) -> GithubActivityValue | None:
        with self.condition:
            while True:
                now = time.monotonic()
                if self.entry is not None and now < self.entry.expires_at:
                    return self.entry.value
                if self.failure_expires_at is not None and now < self.failure_expires_at:
                    return self.entry.value if self.entry is not None else None
                if not self.fetching:
                    self.fetching = True
                    stale_value = self.entry.value if self.entry is not None else None
                    break
                self.condition.wait()

        try:
            value = fetch(client)
        except Exception:
            with self.condition:
                self.failure_expires_at = time.monotonic() + self.failure_ttl_seconds
                self.fetching = False
                self.condition.notify_all()
            return stale_value

        with self.condition:
            self.entry = _CacheEntry(
                value=value,
                expires_at=time.monotonic() + self.ttl_seconds,
            )
            self.failure_expires_at = None
            self.fetching = False
            self.condition.notify_all()
        return value


def _cache_ttl_seconds(env_name: str, default_seconds: float) -> float:
    raw = os.getenv(env_name, "").strip()
    if not raw:
        return default_seconds

    try:
        seconds = float(raw)
    except ValueError:
        return default_seconds

    return max(0.0, seconds)


_ContributionCacheValue = tuple[int, tuple[tuple[GithubContributionDay, ...], ...]]
_CONTRIBUTIONS_CACHE: Final[_ResponseCache[_ContributionCacheValue]] = _ResponseCache(
    ttl_seconds=_cache_ttl_seconds(
        "GITHUB_CONTRIBUTIONS_CACHE_SECONDS",
        DEFAULT_CONTRIBUTIONS_CACHE_SECONDS,
    ),
    failure_ttl_seconds=_cache_ttl_seconds(
        "GITHUB_FAILURE_CACHE_SECONDS",
        DEFAULT_GITHUB_FAILURE_CACHE_SECONDS,
    ),
)
_PUSH_CACHE: Final[_ResponseCache[GithubLatestPush]] = _ResponseCache(
    ttl_seconds=_cache_ttl_seconds(
        "GITHUB_EVENTS_CACHE_SECONDS",
        DEFAULT_GITHUB_API_CACHE_SECONDS,
    ),
    failure_ttl_seconds=_cache_ttl_seconds(
        "GITHUB_FAILURE_CACHE_SECONDS",
        DEFAULT_GITHUB_FAILURE_CACHE_SECONDS,
    ),
)
_OPEN_PRS_CACHE: Final[_ResponseCache[int]] = _ResponseCache(
    ttl_seconds=_cache_ttl_seconds(
        "GITHUB_OPEN_PRS_CACHE_SECONDS",
        DEFAULT_GITHUB_API_CACHE_SECONDS,
    ),
    failure_ttl_seconds=_cache_ttl_seconds(
        "GITHUB_FAILURE_CACHE_SECONDS",
        DEFAULT_GITHUB_FAILURE_CACHE_SECONDS,
    ),
)


class GithubUpstreamError(RuntimeError):
    """Raised when GitHub data cannot be parsed or fetched."""


class _ContributionsParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._cells: dict[str, dict[str, int | str | None]] = {}
        self._cell_order: list[str] = []
        self._tooltip_id: str | None = None
        self._tooltip_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "td":
            cell_id = attributes.get("id")
            raw_date = attributes.get("data-date")
            raw_level = attributes.get("data-level")
            if cell_id is None or raw_date is None or raw_level is None:
                return
            try:
                parsed_date = date.fromisoformat(raw_date)
                level = int(raw_level)
            except ValueError:
                return
            if not 0 <= level <= 4:
                return
            self._cells[cell_id] = {
                "date": parsed_date.isoformat(),
                "level": level,
                "count": None,
            }
            self._cell_order.append(cell_id)
        elif tag == "tool-tip":
            tooltip_for = attributes.get("for")
            if tooltip_for in self._cells:
                self._tooltip_id = tooltip_for
                self._tooltip_text = []

    def handle_data(self, data: str) -> None:
        if self._tooltip_id is not None:
            self._tooltip_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != "tool-tip" or self._tooltip_id is None:
            return

        tooltip_text = " ".join(self._tooltip_text)
        count_match = _COUNT_PATTERN.search(tooltip_text)
        if count_match:
            self._cells[self._tooltip_id]["count"] = int(count_match.group(1).replace(",", ""))
        elif _NO_CONTRIBUTIONS_PATTERN.match(tooltip_text.strip()):
            self._cells[self._tooltip_id]["count"] = 0
        self._tooltip_id = None
        self._tooltip_text = []

    def days(self) -> list[GithubContributionDay]:
        if not self._cell_order or any(
            self._cells[cell_id]["count"] is None for cell_id in self._cell_order
        ):
            raise GithubUpstreamError("GitHub contributions markup had incomplete day data")

        return [
            GithubContributionDay(
                date=str(self._cells[cell_id]["date"]),
                level=int(self._cells[cell_id]["level"]),
                count=int(self._cells[cell_id]["count"]),
            )
            for cell_id in self._cell_order
        ]


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
        headers={"User-Agent": GITHUB_USER_AGENT},
    )


def _request(
    client: httpx2.Client,
    url: str,
    *,
    headers: dict[str, str],
    params: dict[str, str] | None = None,
) -> httpx2.Response:
    try:
        response = client.get(url, headers=headers, params=params)
        response.raise_for_status()
    except httpx2.HTTPError as error:
        raise GithubUpstreamError(f"GitHub request failed: {error.__class__.__name__}") from error
    return response


def _weeks_from_days(
    days: list[GithubContributionDay],
) -> tuple[tuple[GithubContributionDay, ...], ...]:
    by_week: dict[date, list[GithubContributionDay]] = {}
    for day in days:
        parsed_date = date.fromisoformat(day.date)
        sunday = parsed_date - timedelta(days=(parsed_date.weekday() + 1) % 7)
        by_week.setdefault(sunday, []).append(day)

    return tuple(
        tuple(sorted(week, key=lambda day: day.date))
        for _, week in sorted(by_week.items())
    )


def _validate_contribution_days(days: list[GithubContributionDay]) -> None:
    if not days:
        raise GithubUpstreamError("GitHub contributions had no day data")

    try:
        parsed_dates = [date.fromisoformat(day.date) for day in days]
    except ValueError as error:
        raise GithubUpstreamError("GitHub contributions had an invalid date") from error

    unique_dates = set(parsed_dates)
    if len(unique_dates) != len(parsed_dates):
        raise GithubUpstreamError("GitHub contributions had duplicate dates")

    ordered_dates = sorted(unique_dates)
    span_days = (ordered_dates[-1] - ordered_dates[0]).days + 1
    if not MIN_CONTRIBUTION_DAYS <= span_days <= MAX_CONTRIBUTION_DAYS:
        raise GithubUpstreamError("GitHub contributions did not cover one full year")
    if any(
        current != previous + timedelta(days=1)
        for previous, current in zip(ordered_dates, ordered_dates[1:])
    ):
        raise GithubUpstreamError("GitHub contributions had missing dates")


def _fetch_contributions(
    client: httpx2.Client,
) -> tuple[int, tuple[tuple[GithubContributionDay, ...], ...]]:
    response = _request(
        client,
        GITHUB_CONTRIBUTIONS_URL,
        headers={"Accept": "text/html"},
    )
    parser = _ContributionsParser()
    parser.feed(response.text)
    parser.close()
    days = parser.days()
    _validate_contribution_days(days)
    weeks = _weeks_from_days(days)
    return sum(day.count for day in days), weeks


def _first_line(message: object) -> str:
    if not isinstance(message, str):
        return ""
    return message.splitlines()[0].strip() if message.splitlines() else ""


def _fetch_latest_push(client: httpx2.Client) -> GithubLatestPush:
    response = _request(
        client,
        GITHUB_EVENTS_URL,
        headers={"Accept": "application/vnd.github+json"},
        params={"per_page": "100"},
    )
    try:
        events = response.json()
    except ValueError as error:
        raise GithubUpstreamError("GitHub events response was not JSON") from error
    if not isinstance(events, list):
        raise GithubUpstreamError("GitHub events response was not a list")

    push_event = next(
        (
            event for event in events
            if isinstance(event, dict) and event.get("type") == "PushEvent"
        ),
        None,
    )
    if not isinstance(push_event, dict):
        raise GithubUpstreamError("GitHub events had no PushEvent")

    repo_data = push_event.get("repo")
    payload = push_event.get("payload")
    created_at = push_event.get("created_at")
    if not isinstance(repo_data, dict) or not isinstance(payload, dict):
        raise GithubUpstreamError("GitHub PushEvent had incomplete data")
    repo_name = repo_data.get("name")
    commits = payload.get("commits")
    head = payload.get("head")
    if not isinstance(repo_name, str) or not isinstance(created_at, str):
        raise GithubUpstreamError("GitHub PushEvent had incomplete data")

    message = ""
    if isinstance(commits, list) and commits:
        commit = commits[-1]
        if isinstance(commit, dict):
            message = _first_line(commit.get("message"))
    if not message:
        if not isinstance(head, str) or not head:
            raise GithubUpstreamError("GitHub PushEvent had no commit subject")
        commit_response = _request(
            client,
            "https://api.github.com/repos/"
            f"{quote(repo_name, safe='/')}/commits/{quote(head, safe='')}",
            headers={"Accept": "application/vnd.github+json"},
        )
        try:
            commit_payload = commit_response.json()
        except ValueError as error:
            raise GithubUpstreamError("GitHub commit response was not JSON") from error
        if isinstance(commit_payload, dict):
            commit_data = commit_payload.get("commit")
            if isinstance(commit_data, dict):
                message = _first_line(commit_data.get("message"))
    if not message:
        raise GithubUpstreamError("GitHub PushEvent had no commit subject")
    return GithubLatestPush(
        repo=repo_name.rsplit("/", maxsplit=1)[-1],
        message=message,
        pushed_at=created_at,
    )


def _fetch_open_prs(client: httpx2.Client) -> int:
    response = _request(
        client,
        GITHUB_SEARCH_URL,
        headers={"Accept": "application/vnd.github+json"},
        params={
            "q": "author:hwang2409 type:pr state:open is:public",
            "per_page": "1",
        },
    )
    try:
        payload = response.json()
    except ValueError as error:
        raise GithubUpstreamError("GitHub search response was not JSON") from error
    if not isinstance(payload, dict) or not isinstance(payload.get("total_count"), int):
        raise GithubUpstreamError("GitHub search response had no total_count")
    return max(0, payload["total_count"])


def _cached_value(
    cache: _ResponseCache[GithubActivityValue],
    client: httpx2.Client,
    fetch: Callable[[httpx2.Client], GithubActivityValue],
) -> GithubActivityValue | None:
    return cache.get_or_fetch(client, fetch)


router = APIRouter(prefix="/github", tags=["github"])


@router.get("/activity", response_model=GithubActivityResponse)
def github_activity() -> GithubActivityResponse:
    with _create_http_client() as client:
        contributions = _cached_value(_CONTRIBUTIONS_CACHE, client, _fetch_contributions)
        latest_push = _cached_value(_PUSH_CACHE, client, _fetch_latest_push)
        open_prs = _cached_value(_OPEN_PRS_CACHE, client, _fetch_open_prs)

    total_contributions = contributions[0] if contributions is not None else None
    weeks = contributions[1] if contributions is not None else None
    failed_parts = sum(value is None for value in (contributions, latest_push, open_prs))
    activity_status: GithubActivityStatus = (
        "unavailable" if failed_parts == 3 else "partial" if failed_parts else "ok"
    )
    return GithubActivityResponse(
        status=activity_status,
        total_contributions=total_contributions,
        weeks=weeks,
        latest_push=latest_push,
        open_prs=open_prs,
    )

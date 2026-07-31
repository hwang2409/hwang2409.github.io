const DEFAULT_API_URL = 'https://hwang2409githubio-production.up.railway.app';
const LAB_API_URL = process.env.NEXT_PUBLIC_LAB_API_URL || DEFAULT_API_URL;

export type SpotifyStatus = 'ok' | 'not_configured' | 'reauthorization_required';
export type SpotifyPlaybackKind = 'current' | 'recent' | 'empty';

export type SpotifyTrack = {
  readonly rank: number;
  readonly title: string;
  readonly artists: readonly string[];
  readonly album: string;
  readonly url: string | null;
  readonly imageUrl: string | null;
};

export type SpotifyArtist = {
  readonly rank: number;
  readonly name: string;
  readonly genres: readonly string[];
  readonly url: string | null;
  readonly imageUrl: string | null;
};

export type SpotifyPlaybackTrack = {
  readonly title: string;
  readonly artists: readonly string[];
  readonly album: string;
  readonly url: string | null;
  readonly imageUrl: string | null;
  readonly playedAt: string | null;
  readonly isPlaying: boolean;
};

export type SpotifyStats = {
  readonly status: SpotifyStatus;
  readonly configured: boolean;
  readonly generatedAt: string;
  readonly timeRange: string;
  readonly timeRangeLabel: string;
  readonly topTracks: readonly SpotifyTrack[];
  readonly topArtists: readonly SpotifyArtist[];
  readonly topGenres: readonly string[];
  readonly note: string;
};

export type SpotifyNow = {
  readonly status: SpotifyStatus;
  readonly configured: boolean;
  readonly generatedAt: string;
  readonly playbackKind: SpotifyPlaybackKind;
  readonly track: SpotifyPlaybackTrack | null;
  readonly note: string;
};

export type SpotifyInsightTrack = {
  readonly rank: number;
  readonly title: string;
  readonly artists: readonly string[];
  readonly album: string;
  readonly url: string | null;
  readonly imageUrl: string | null;
  readonly plays: number;
  readonly completions: number;
  readonly skips: number;
  readonly completionRate: number;
  readonly skipRate: number;
  readonly averageSkipPercent: number | null;
};

export type SpotifyTimelineBucket = {
  readonly index: number;
  readonly startPercent: number;
  readonly endPercent: number;
  readonly listens: number;
  readonly skips: number;
};

export type SpotifyTimeline = {
  readonly title: string;
  readonly artists: readonly string[];
  readonly album: string;
  readonly buckets: readonly SpotifyTimelineBucket[];
};

export type SpotifyInsightMetric = {
  readonly label: string;
  readonly value: string;
  readonly note: string;
};

export type SpotifyInsightSection = {
  readonly title: string;
  readonly eyebrow: string;
  readonly metrics: readonly SpotifyInsightMetric[];
};

export type SpotifyInsights = {
  readonly status: SpotifyStatus;
  readonly configured: boolean;
  readonly generatedAt: string;
  readonly observedSamples: number;
  readonly totalPlays: number;
  readonly activeDays: number;
  readonly topPlayed: readonly SpotifyInsightTrack[];
  readonly skipProfile: readonly SpotifyInsightTrack[];
  readonly timeline: SpotifyTimeline | null;
  readonly sections: readonly SpotifyInsightSection[];
  readonly note: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function readRecordArray(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readStatus(value: unknown): SpotifyStatus {
  const status = readString(value);
  if (
    status === 'ok' ||
    status === 'not_configured' ||
    status === 'reauthorization_required'
  ) {
    return status;
  }

  throw new Error('Spotify response had an unknown status');
}

function readPlaybackKind(value: unknown): SpotifyPlaybackKind {
  const playbackKind = readString(value);
  if (
    playbackKind === 'current' ||
    playbackKind === 'recent' ||
    playbackKind === 'empty'
  ) {
    return playbackKind;
  }

  throw new Error('Spotify response had an unknown playback kind');
}

function parseTrack(value: Record<string, unknown>): SpotifyTrack {
  return {
    rank: readNumber(value.rank, 0),
    title: readString(value.title),
    artists: readStringArray(value.artists),
    album: readString(value.album),
    url: readNullableString(value.url),
    imageUrl: readNullableString(value.image_url),
  };
}

function parseArtist(value: Record<string, unknown>): SpotifyArtist {
  return {
    rank: readNumber(value.rank, 0),
    name: readString(value.name),
    genres: readStringArray(value.genres),
    url: readNullableString(value.url),
    imageUrl: readNullableString(value.image_url),
  };
}

function parsePlaybackTrack(value: unknown): SpotifyPlaybackTrack | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    title: readString(value.title),
    artists: readStringArray(value.artists),
    album: readString(value.album),
    url: readNullableString(value.url),
    imageUrl: readNullableString(value.image_url),
    playedAt: readNullableString(value.played_at),
    isPlaying: readBoolean(value.is_playing),
  };
}

function parseSpotifyStats(value: unknown): SpotifyStats {
  if (!isRecord(value)) {
    throw new Error('Spotify stats response was not an object');
  }

  return {
    status: readStatus(value.status),
    configured: readBoolean(value.configured),
    generatedAt: readString(value.generated_at),
    timeRange: readString(value.time_range),
    timeRangeLabel: readString(value.time_range_label, 'recently'),
    topTracks: readRecordArray(value.top_tracks).map(parseTrack),
    topArtists: readRecordArray(value.top_artists).map(parseArtist),
    topGenres: readStringArray(value.top_genres),
    note: readString(value.note),
  };
}

function parseSpotifyNow(value: unknown): SpotifyNow {
  if (!isRecord(value)) {
    throw new Error('Spotify now response was not an object');
  }

  return {
    status: readStatus(value.status),
    configured: readBoolean(value.configured),
    generatedAt: readString(value.generated_at),
    playbackKind: readPlaybackKind(value.playback_kind),
    track: parsePlaybackTrack(value.track),
    note: readString(value.note),
  };
}

function parseInsightTrack(value: Record<string, unknown>): SpotifyInsightTrack {
  return {
    rank: readNumber(value.rank, 0),
    title: readString(value.title),
    artists: readStringArray(value.artists),
    album: readString(value.album),
    url: readNullableString(value.url),
    imageUrl: readNullableString(value.image_url),
    plays: readNumber(value.plays, 0),
    completions: readNumber(value.completions, 0),
    skips: readNumber(value.skips, 0),
    completionRate: readNumber(value.completion_rate, 0),
    skipRate: readNumber(value.skip_rate, 0),
    averageSkipPercent:
      typeof value.average_skip_percent === 'number' ? value.average_skip_percent : null,
  };
}

function parseTimelineBucket(value: Record<string, unknown>): SpotifyTimelineBucket {
  return {
    index: readNumber(value.index, 0),
    startPercent: readNumber(value.start_percent, 0),
    endPercent: readNumber(value.end_percent, 0),
    listens: readNumber(value.listens, 0),
    skips: readNumber(value.skips, 0),
  };
}

function parseTimeline(value: unknown): SpotifyTimeline | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    title: readString(value.title),
    artists: readStringArray(value.artists),
    album: readString(value.album),
    buckets: readRecordArray(value.buckets).map(parseTimelineBucket),
  };
}

function parseMetric(value: Record<string, unknown>): SpotifyInsightMetric {
  return {
    label: readString(value.label),
    value: readString(value.value),
    note: readString(value.note),
  };
}

function parseSection(value: Record<string, unknown>): SpotifyInsightSection {
  return {
    title: readString(value.title),
    eyebrow: readString(value.eyebrow),
    metrics: readRecordArray(value.metrics).map(parseMetric),
  };
}

function parseSpotifyInsights(value: unknown): SpotifyInsights {
  if (!isRecord(value)) {
    throw new Error('Spotify insights response was not an object');
  }

  return {
    status: readStatus(value.status),
    configured: readBoolean(value.configured),
    generatedAt: readString(value.generated_at),
    observedSamples: readNumber(value.observed_samples, 0),
    totalPlays: readNumber(value.total_plays, 0),
    activeDays: readNumber(value.active_days, 0),
    topPlayed: readRecordArray(value.top_played).map(parseInsightTrack),
    skipProfile: readRecordArray(value.skip_profile).map(parseInsightTrack),
    timeline: parseTimeline(value.timeline),
    sections: readRecordArray(value.sections).map(parseSection),
    note: readString(value.note),
  };
}

async function fetchSpotifyJson(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${LAB_API_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const message =
      response.status === 404
        ? 'spotify is not connected on this backend yet.'
        : `spotify returned ${response.status}`;
    throw new Error(message);
  }

  const value: unknown = await response.json();
  return value;
}

export async function fetchSpotifyStats(): Promise<SpotifyStats> {
  return parseSpotifyStats(await fetchSpotifyJson('/spotify/stats'));
}

export async function fetchSpotifyNow(): Promise<SpotifyNow> {
  return parseSpotifyNow(await fetchSpotifyJson('/spotify/now'));
}

export async function fetchSpotifyInsights(): Promise<SpotifyInsights> {
  return parseSpotifyInsights(await fetchSpotifyJson('/spotify/insights'));
}

export async function observeSpotifyPlayback(): Promise<SpotifyInsights> {
  return parseSpotifyInsights(await fetchSpotifyJson('/spotify/observe', { method: 'POST' }));
}

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

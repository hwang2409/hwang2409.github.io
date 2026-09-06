'use client';

import styles from '@/components/SpotifyStats.module.css';
import MusicCoverShelf, { type MusicCoverItem } from '@/components/MusicCoverShelf';
import { formatArtists, SpotifyTrackFeature } from '@/components/SpotifyTrackFeature';
import type { SpotifyArtist, SpotifyInsights, SpotifyNow, SpotifyStats, SpotifyTrack } from '@/lib/spotify';

function assertNever(value: never): never {
  throw new Error(`Unexpected Spotify state: ${JSON.stringify(value)}`);
}

function statusCopy(status: SpotifyStats['status']): string {
  switch (status) {
    case 'ok':
      return 'live';
    case 'not_configured':
      return 'not configured';
    case 'reauthorization_required':
      return 'needs auth';
    default:
      return assertNever(status);
  }
}

export function playbackLabel(now: SpotifyNow): string {
  switch (now.playbackKind) {
    case 'current':
      return 'STREAMING';
    case 'recent':
      return 'last played';
    case 'empty':
      return 'playback';
    default:
      return assertNever(now.playbackKind);
  }
}

function NowBlock({ now }: { readonly now: SpotifyNow }) {
  if (now.status !== 'ok') {
    return <p className={styles.empty}>{now.note}</p>;
  }

  if (now.track === null) {
    return <p className={styles.empty}>spotify returned no active or recent track.</p>;
  }

  return (
    <SpotifyTrackFeature
      label={playbackLabel(now)}
      title={now.track.title}
      artists={now.track.artists}
      album={now.track.album}
      url={now.track.url}
      imageUrl={now.track.imageUrl}
      fallback="now"
      labelTone={now.playbackKind === 'current' ? 'warn' : undefined}
    />
  );
}

function trackCoverItem(track: SpotifyTrack): MusicCoverItem {
  return {
    key: `track-${track.rank}-${track.title}`,
    rank: track.rank,
    title: track.title,
    subtitle: formatArtists(track.artists),
    meta: track.album,
    imageUrl: track.imageUrl,
    url: track.url,
    fallback: String(track.rank),
  };
}

function artistCoverItem(artist: SpotifyArtist): MusicCoverItem {
  return {
    key: `artist-${artist.rank}-${artist.name}`,
    rank: artist.rank,
    title: artist.name,
    subtitle: artist.genres.slice(0, 2).join(', ') || 'artist',
    meta: 'top artist',
    imageUrl: artist.imageUrl,
    url: artist.url,
    fallback: String(artist.rank),
  };
}

function albumCoverItems(stats: SpotifyStats): MusicCoverItem[] {
  const albums = new Map<string, SpotifyTrack>();

  for (const track of stats.topTracks) {
    if (!albums.has(track.album)) {
      albums.set(track.album, track);
    }
  }

  return Array.from(albums, ([album, track]) => ({
    key: `album-${album}`,
    rank: track.rank,
    title: album,
    subtitle: formatArtists(track.artists),
    meta: 'top album',
    imageUrl: track.imageUrl,
    url: track.url,
    fallback: String(track.rank),
  }));
}

function TopTracks({ stats }: { readonly stats: SpotifyStats }) {
  if (stats.status !== 'ok') {
    return <p className={styles.empty}>{stats.note}</p>;
  }

  return (
    <MusicCoverShelf
      items={stats.topTracks.map(trackCoverItem)}
      empty="spotify returned no top tracks yet."
      variant="wall"
    />
  );
}

function TopArtists({ stats }: { readonly stats: SpotifyStats }) {
  if (stats.status !== 'ok') {
    return <p className={styles.empty}>{stats.note}</p>;
  }

  return (
    <MusicCoverShelf
      items={stats.topArtists.map(artistCoverItem)}
      empty="spotify returned no top artists yet."
      variant="wall"
    />
  );
}

function Genres({ stats }: { readonly stats: SpotifyStats }) {
  if (stats.status !== 'ok') {
    return <p className={styles.empty}>{stats.note}</p>;
  }

  if (stats.topGenres.length === 0) {
    return <p className={styles.empty}>spotify returned no genre metadata for these top artists.</p>;
  }

  return (
    <ul className={styles.chips} aria-label="Top Spotify genres">
      {stats.topGenres.map((genre) => (
        <li key={genre}>{genre}</li>
      ))}
    </ul>
  );
}

function StatusGrid({
  now,
  stats,
  insights,
}: {
  readonly now: SpotifyNow;
  readonly stats: SpotifyStats;
  readonly insights: SpotifyInsights;
}) {
  return (
    <dl className={styles.statusGrid}>
      <div>
        <dt>playback</dt>
        <dd>{statusCopy(now.status)}</dd>
      </div>
      <div>
        <dt>kind</dt>
        <dd>{now.playbackKind}</dd>
      </div>
      <div>
        <dt>stats</dt>
        <dd>{statusCopy(stats.status)}</dd>
      </div>
      <div>
        <dt>range</dt>
        <dd>{stats.timeRangeLabel}</dd>
      </div>
      <div>
        <dt>samples</dt>
        <dd>{insights.observedSamples}</dd>
      </div>
    </dl>
  );
}

export function MusicPlaybackPanel({ now }: { readonly now: SpotifyNow }) {
  return (
    <div className={`${styles.musicSection} ${styles.playbackPanel}`}>
      <NowBlock now={now} />
    </div>
  );
}

export function MusicFilesPanel({ stats }: { readonly stats: SpotifyStats }) {
  return (
    <section className={`${styles.musicSection} ${styles.filesPanel}`} aria-labelledby="music-files">
      <h2 id="music-files">files</h2>
      <dl className={styles.fileList}>
        <div>
          <dt>albums</dt>
          <dd>
            {stats.status === 'ok' ? (
              <MusicCoverShelf
                items={albumCoverItems(stats)}
                empty="spotify returned no top albums yet."
                variant="tagged"
              />
            ) : <p className={styles.empty}>{stats.note}</p>}
          </dd>
        </div>
        <div>
          <dt>artists</dt>
          <dd>
            {stats.status === 'ok' ? (
              <MusicCoverShelf
                items={stats.topArtists.map(artistCoverItem)}
                empty="spotify returned no top artists yet."
                variant="tagged"
              />
            ) : <p className={styles.empty}>{stats.note}</p>}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function MusicStatusPanel({
  now,
  stats,
  insights,
}: {
  readonly now: SpotifyNow;
  readonly stats: SpotifyStats;
  readonly insights: SpotifyInsights;
}) {
  return (
    <section className={`${styles.musicSection} ${styles.statusPanel}`} aria-labelledby="music-status">
      <div className={styles.header}>
        <h2 id="music-status">status</h2>
        <span>backend</span>
      </div>
      <StatusGrid now={now} stats={stats} insights={insights} />
      <p className={styles.note}>{now.note}</p>
      <p className={styles.note}>{stats.note}</p>
    </section>
  );
}

export function MusicTracksPanel({ stats }: { readonly stats: SpotifyStats }) {
  return (
    <section className={`${styles.musicSection} ${styles.tracksPanel}`} aria-labelledby="music-tracks">
      <div className={styles.header}>
        <h2 id="music-tracks">tracks</h2>
        <span>{stats.timeRangeLabel}</span>
      </div>
      <TopTracks stats={stats} />
    </section>
  );
}

export function MusicArtistsPanel({ stats }: { readonly stats: SpotifyStats }) {
  return (
    <section className={`${styles.musicSection} ${styles.artistsPanel}`} aria-labelledby="music-artists">
      <div className={styles.header}>
        <h2 id="music-artists">artists</h2>
        <span>{stats.timeRangeLabel}</span>
      </div>
      <TopArtists stats={stats} />
    </section>
  );
}

export function MusicGenresPanel({ stats }: { readonly stats: SpotifyStats }) {
  return (
    <section className={`${styles.musicSection} ${styles.genresPanel}`} aria-labelledby="music-genres">
      <div className={styles.header}>
        <h2 id="music-genres">genres</h2>
        <span>top</span>
      </div>
      <Genres stats={stats} />
    </section>
  );
}

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from '@/components/SpotifyStats.module.css';
import MusicCoverShelf, { type MusicCoverItem } from '@/components/MusicCoverShelf';
import { formatArtists, SpotifyTrackFeature } from '@/components/SpotifyTrackFeature';
import type { SpotifyArtist, SpotifyNow, SpotifyStats, SpotifyTrack } from '@/lib/spotify';

function assertNever(value: never): never {
  throw new Error(`Unexpected Spotify state: ${JSON.stringify(value)}`);
}

function playbackLabel(now: SpotifyNow): string {
  switch (now.playbackKind) {
    case 'current':
      return 'now playing';
    case 'recent':
      return 'last played';
    case 'empty':
      return 'playback';
    default:
      return assertNever(now.playbackKind);
  }
}

function NowBlock({ now }: { readonly now: SpotifyNow }) {
  const track = now.track;
  const [progressMs, setProgressMs] = useState(track?.progressMs ?? null);
  const progressAnchor = useRef<{
    readonly startedAt: number;
    readonly progressMs: number;
  } | null>(null);
  const progressFromTrack = track?.progressMs ?? null;
  const durationFromTrack = track?.durationMs ?? null;
  const isPlaying = track?.isPlaying ?? false;
  const progressUnavailable = progressMs === null;

  useEffect(() => {
    const nextProgressMs = progressFromTrack;
    setProgressMs(nextProgressMs);

    if (
      nextProgressMs === null ||
      durationFromTrack === null ||
      durationFromTrack <= 0
    ) {
      progressAnchor.current = null;
      return;
    }

    progressAnchor.current = {
      startedAt: performance.now(),
      progressMs: Math.min(Math.max(nextProgressMs, 0), durationFromTrack),
    };
  }, [durationFromTrack, progressFromTrack, track?.title, track?.url]);

  useEffect(() => {
    if (
      !isPlaying ||
      progressUnavailable ||
      durationFromTrack === null ||
      durationFromTrack <= 0
    ) {
      return undefined;
    }

    const durationMs = durationFromTrack;
    const initialAnchor = progressAnchor.current;
    if (initialAnchor === null || initialAnchor.progressMs >= durationMs) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const anchor = progressAnchor.current;
      if (anchor === null) {
        window.clearInterval(intervalId);
        return;
      }

      const elapsedMs = performance.now() - anchor.startedAt;
      const nextProgressMs = Math.min(anchor.progressMs + elapsedMs, durationMs);
      setProgressMs(nextProgressMs);

      if (nextProgressMs >= durationMs) {
        window.clearInterval(intervalId);
        progressAnchor.current = null;
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [durationFromTrack, isPlaying, progressUnavailable]);

  if (now.status !== 'ok') {
    return <p className={styles.empty}>{now.note}</p>;
  }

  if (now.track === null) {
    return <p className={styles.empty}>not playing.</p>;
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
      emphasizeLabel={now.playbackKind === 'current'}
      progressMs={now.playbackKind === 'current' && now.track.isPlaying ? progressMs : null}
      durationMs={now.playbackKind === 'current' && now.track.isPlaying ? now.track.durationMs : null}
    />
  );
}

function trackCoverItem(track: SpotifyTrack): MusicCoverItem {
  return {
    key: `track-${track.title}-${track.url ?? ''}`,
    title: track.title,
    subtitle: formatArtists(track.artists),
    imageUrl: track.imageUrl,
    url: track.url,
    fallback: track.title.slice(0, 1) || '?',
  };
}

function artistCoverItem(artist: SpotifyArtist): MusicCoverItem {
  return {
    key: `artist-${artist.name}-${artist.url ?? ''}`,
    title: artist.name,
    subtitle: artist.genres.slice(0, 2).join(', '),
    imageUrl: artist.imageUrl,
    url: artist.url,
    fallback: artist.name.slice(0, 1) || '?',
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
    title: album,
    subtitle: formatArtists(track.artists),
    imageUrl: track.imageUrl,
    url: track.url,
    fallback: album.slice(0, 1) || '?',
  })).slice(0, 5);
}

function StatsMessage({ stats }: { readonly stats: SpotifyStats | null }) {
  return <p className={styles.empty}>{stats?.note ?? 'checking spotify.'}</p>;
}

export function MusicPlaybackPanel({ now }: { readonly now: SpotifyNow }) {
  return <NowBlock now={now} />;
}

export function MusicTracksPanel({ stats, headerExtra }: {
  readonly stats: SpotifyStats | null;
  readonly headerExtra?: ReactNode;
}) {
  return (
    <section className={styles.musicSection} aria-labelledby="music-tracks">
      <div className={styles.header}>
        <h2 id="music-tracks">top tracks</h2>
        {headerExtra}
      </div>
      {stats?.status === 'ok' ? (
        <MusicCoverShelf
          items={stats.topTracks.slice(0, 5).map(trackCoverItem)}
          empty="spotify returned no top tracks yet."
        />
      ) : <StatsMessage stats={stats} />}
    </section>
  );
}

export function MusicArtistsPanel({ stats }: { readonly stats: SpotifyStats | null }) {
  return (
    <section className={styles.musicSection} aria-labelledby="music-artists">
      <div className={styles.header}>
        <h2 id="music-artists">top artists</h2>
      </div>
      {stats?.status === 'ok' ? (
        <MusicCoverShelf
          items={stats.topArtists.map(artistCoverItem)}
          empty="spotify returned no top artists yet."
        />
      ) : <StatsMessage stats={stats} />}
    </section>
  );
}

export function MusicAlbumsPanel({ stats }: { readonly stats: SpotifyStats | null }) {
  return (
    <section className={styles.musicSection} aria-labelledby="music-albums">
      <div className={styles.header}>
        <h2 id="music-albums">top albums</h2>
      </div>
      {stats?.status === 'ok' ? (
        <MusicCoverShelf
          items={albumCoverItems(stats)}
          empty="spotify returned no top albums yet."
        />
      ) : <StatsMessage stats={stats} />}
    </section>
  );
}

export function MusicGenresPanel({ stats }: { readonly stats: SpotifyStats | null }) {
  if (!stats || stats.status !== 'ok' || stats.topGenres.length === 0) {
    return null;
  }

  return (
    <section className={styles.musicSection} aria-labelledby="music-genres">
      <div className={styles.header}>
        <h2 id="music-genres">genres</h2>
      </div>
      <p className={styles.genres}>{stats.topGenres.join(', ')}</p>
    </section>
  );
}

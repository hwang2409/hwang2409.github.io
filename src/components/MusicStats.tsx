'use client';

import { useEffect, useState } from 'react';
import {
  MusicAlbumsPanel,
  MusicArtistsPanel,
  MusicGenresPanel,
  MusicPlaybackPanel,
  MusicTracksPanel,
} from '@/components/MusicSpotifyPanels';
import styles from '@/components/SpotifyStats.module.css';
import { fetchSpotifyNow, fetchSpotifyStats, type SpotifyNow, type SpotifyStats } from '@/lib/spotify';

type MusicData = {
  readonly now: SpotifyNow;
  readonly stats: SpotifyStats;
};

type MusicState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly data: MusicData }
  | { readonly kind: 'error' };

function assertNever(value: never): never {
  throw new Error(`Unexpected Spotify state: ${JSON.stringify(value)}`);
}

function unavailableMusicState(message: string) {
  return (
    <>
      <section className={styles.musicSection} aria-labelledby="music-now-playing">
        <h2 id="music-now-playing">now playing</h2>
        <p className={styles.empty}>{message}</p>
      </section>
      <section className={styles.musicSection} aria-labelledby="music-tracks">
        <h2 id="music-tracks">top tracks</h2>
        <p className={styles.empty}>{message}</p>
      </section>
      <section className={styles.musicSection} aria-labelledby="music-artists">
        <h2 id="music-artists">top artists</h2>
        <p className={styles.empty}>{message}</p>
      </section>
      <section className={styles.musicSection} aria-labelledby="music-albums">
        <h2 id="music-albums">top albums</h2>
        <p className={styles.empty}>{message}</p>
      </section>
    </>
  );
}

function renderMusicState(state: MusicState) {
  switch (state.kind) {
    case 'loading':
      return unavailableMusicState('checking spotify.');
    case 'ready':
      return (
        <>
          <section className={styles.musicSection} aria-labelledby="music-now-playing">
            <h2 id="music-now-playing">now playing</h2>
            <MusicPlaybackPanel now={state.data.now} />
          </section>
          <MusicTracksPanel stats={state.data.stats} />
          <MusicArtistsPanel stats={state.data.stats} />
          <MusicAlbumsPanel stats={state.data.stats} />
          <MusicGenresPanel stats={state.data.stats} />
        </>
      );
    case 'error':
      return unavailableMusicState('spotify unavailable.');
    default:
      return assertNever(state);
  }
}

export default function MusicStats() {
  const [state, setState] = useState<MusicState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;

    function setLiveData(now: SpotifyNow) {
      setState((current) => {
        if (current.kind !== 'ready') {
          return current;
        }

        return {
          kind: 'ready',
          data: {
            ...current.data,
            now,
          },
        };
      });
    }

    function pollNow() {
      if (document.hidden) {
        return;
      }

      fetchSpotifyNow()
        .then((now) => {
          if (!cancelled) {
            setLiveData(now);
          }
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
        });
    }

    async function loadMusic() {
      try {
        const [now, stats] = await Promise.all([fetchSpotifyNow(), fetchSpotifyStats()]);
        if (!cancelled) {
          setState({ kind: 'ready', data: { now, stats } });
          intervalId = window.setInterval(pollNow, 10_000);
        }
      } catch {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      }
    }

    loadMusic();

    return () => {
      cancelled = true;
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <section className={styles.music} aria-label="music">
      {renderMusicState(state)}
    </section>
  );
}

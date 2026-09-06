'use client';

import { useEffect, useState } from 'react';
import {
  MusicLocalPanel,
  MusicMetricSections,
  MusicRealCountsPanel,
  MusicSkipPanel,
  MusicTimelinePanel,
} from '@/components/MusicInsightPanels';
import {
  MusicArtistsPanel,
  MusicFilesPanel,
  MusicGenresPanel,
  MusicPlaybackPanel,
  MusicStatusPanel,
  MusicTracksPanel,
} from '@/components/MusicSpotifyPanels';
import styles from '@/components/SpotifyStats.module.css';
import {
  fetchSpotifyNow,
  fetchSpotifyStats,
  observeSpotifyPlayback,
  type SpotifyInsights,
  type SpotifyNow,
  type SpotifyStats,
} from '@/lib/spotify';

type MusicData = {
  readonly now: SpotifyNow;
  readonly stats: SpotifyStats;
  readonly insights: SpotifyInsights;
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
      <section className={`${styles.musicSection} ${styles.nowPlayingSection}`}>
        <h2>now playing</h2>
        <p className={styles.empty}>{message}</p>
      </section>
      <section className={`${styles.musicSection} ${styles.filesPanel}`}>
        <h2>files</h2>
        <p className={styles.empty}>{message}</p>
      </section>
      <section className={`${styles.musicSection} ${styles.metricsSection}`}>
        <h2>metrics</h2>
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
          <section className={`${styles.musicSection} ${styles.nowPlayingSection}`} aria-labelledby="music-now-playing">
            <h2 id="music-now-playing">now playing</h2>
            <MusicPlaybackPanel now={state.data.now} />
          </section>

          <MusicFilesPanel stats={state.data.stats} />

          <section className={`${styles.musicSection} ${styles.metricsSection}`} aria-labelledby="music-metrics">
            <h2 id="music-metrics">metrics</h2>
            <div className={styles.musicDashboard}>
              <div className={styles.musicMainColumn}>
                <MusicTimelinePanel insights={state.data.insights} />
                <MusicRealCountsPanel insights={state.data.insights} />
                <MusicTracksPanel stats={state.data.stats} />
                <MusicArtistsPanel stats={state.data.stats} />
                <MusicMetricSections insights={state.data.insights} />
              </div>

              <aside className={styles.musicMetricRail} aria-label="Music behavior metrics">
                <MusicStatusPanel
                  now={state.data.now}
                  stats={state.data.stats}
                  insights={state.data.insights}
                />
                <MusicLocalPanel insights={state.data.insights} />
                <MusicSkipPanel insights={state.data.insights} />
                <MusicGenresPanel stats={state.data.stats} />
              </aside>
            </div>
          </section>
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

    function setLiveData(now: SpotifyNow, insights: SpotifyInsights) {
      setState((current) => {
        if (current.kind !== 'ready') {
          return current;
        }

        return {
          kind: 'ready',
          data: {
            ...current.data,
            now,
            insights,
          },
        };
      });
    }

    async function loadMusic() {
      try {
        const [now, stats, insights] = await Promise.all([
          fetchSpotifyNow(),
          fetchSpotifyStats(),
          observeSpotifyPlayback(),
        ]);
        if (!cancelled) {
          setState({ kind: 'ready', data: { now, stats, insights } });
        }
      } catch {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      }
    }

    loadMusic();
    const intervalId = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      Promise.all([fetchSpotifyNow(), observeSpotifyPlayback()])
        .then(([now, insights]) => {
          if (!cancelled) {
            setLiveData(now, insights);
          }
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
        });
    }, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className={styles.music} aria-label="music">
      {renderMusicState(state)}
    </section>
  );
}

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
  | { readonly kind: 'error'; readonly message: string };

function assertNever(value: never): never {
  throw new Error(`Unexpected Spotify state: ${JSON.stringify(value)}`);
}

function renderMusicState(state: MusicState) {
  switch (state.kind) {
    case 'loading':
      return <p className={styles.empty}>checking spotify.</p>;
    case 'ready':
      return (
        <div className={styles.musicDashboard}>
          <div className={styles.musicMainColumn}>
            <div className={styles.musicHeroGrid}>
              <MusicPlaybackPanel now={state.data.now} />
              <MusicTimelinePanel insights={state.data.insights} />
            </div>

            <div className={styles.musicPrimaryShelves}>
              <MusicRealCountsPanel insights={state.data.insights} />
              <MusicTracksPanel stats={state.data.stats} />
              <MusicArtistsPanel stats={state.data.stats} />
            </div>

            <div className={styles.musicMetricsBand}>
              <MusicMetricSections insights={state.data.insights} />
            </div>
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
      );
    case 'error':
      return <p className={styles.empty}>{state.message}</p>;
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
      } catch (error) {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'spotify request failed',
          });
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
    <section className={styles.music} aria-labelledby="music-title">
      <div className={`${styles.header} ${styles.musicHeader}`}>
        <h2 id="music-title">spotify</h2>
        <span>music</span>
      </div>
      {renderMusicState(state)}
    </section>
  );
}

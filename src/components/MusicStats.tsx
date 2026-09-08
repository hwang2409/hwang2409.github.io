'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MusicAlbumsPanel,
  MusicArtistsPanel,
  MusicGenresPanel,
  MusicPlaybackPanel,
  MusicTracksPanel,
} from '@/components/MusicSpotifyPanels';
import styles from '@/components/SpotifyStats.module.css';
import {
  fetchSpotifyNow,
  fetchSpotifyStats,
  type SpotifyNow,
  type SpotifyStats,
  type SpotifyTimeRange,
} from '@/lib/spotify';

type MusicData = {
  readonly now: SpotifyNow;
  readonly stats: SpotifyStats | null;
  readonly statsLoading: boolean;
  readonly statsError: string | null;
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
      <section className={styles.musicSection} aria-labelledby="music-listening">
        <h2 id="music-listening">listening</h2>
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

const TIME_RANGE_OPTIONS: readonly { value: SpotifyTimeRange; label: string }[] = [
  { value: 'short_term', label: 'last month' },
  { value: 'medium_term', label: 'last 6 months' },
  { value: 'long_term', label: 'last year' },
];

function timeRangeLabel(range: SpotifyTimeRange): string {
  return TIME_RANGE_OPTIONS.find((option) => option.value === range)?.label ?? 'selected range';
}

function TimeRangeSelector({
  selectedRange,
  onChange,
  disabled,
}: {
  readonly selectedRange: SpotifyTimeRange;
  readonly onChange: (range: SpotifyTimeRange) => void;
  readonly disabled: boolean;
}) {
  return (
    <div className={styles.rangeSelector} role="group" aria-label="time range" aria-busy={disabled}>
      {TIME_RANGE_OPTIONS.map((option) => (
        <button
          className={option.value === selectedRange ? styles.rangeSelected : undefined}
          disabled={disabled}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
          aria-pressed={option.value === selectedRange}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function renderMusicState(
  state: MusicState,
  selectedRange: SpotifyTimeRange,
  onRangeChange: (range: SpotifyTimeRange) => void,
) {
  switch (state.kind) {
    case 'loading':
      return unavailableMusicState('checking spotify.');
    case 'ready':
      return (
        <>
          <section className={styles.musicSection} aria-labelledby="music-listening">
            <h2 id="music-listening">listening</h2>
            <MusicPlaybackPanel now={state.data.now} />
          </section>
          {state.data.statsError !== null ? (
            <p className={styles.empty} role="status">{state.data.statsError}</p>
          ) : null}
          <MusicTracksPanel
            stats={state.data.stats}
            headerExtra={(
              <TimeRangeSelector
                disabled={state.data.statsLoading}
                onChange={onRangeChange}
                selectedRange={selectedRange}
              />
            )}
          />
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
  const [selectedRange, setSelectedRange] = useState<SpotifyTimeRange>('medium_term');
  const statsRequestId = useRef(0);

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

    function refreshOnVisibilityChange() {
      if (!document.hidden) {
        pollNow();
      }
    }

    async function loadMusic() {
      try {
        const [now, stats] = await Promise.all([fetchSpotifyNow(), fetchSpotifyStats()]);
        if (!cancelled) {
          setState({ kind: 'ready', data: { now, stats, statsLoading: false, statsError: null } });
          intervalId = window.setInterval(pollNow, 30_000);
          document.addEventListener('visibilitychange', refreshOnVisibilityChange);
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
      document.removeEventListener('visibilitychange', refreshOnVisibilityChange);
    };
  }, []);

  function changeRange(range: SpotifyTimeRange) {
    if (range === selectedRange && state.kind === 'ready' && state.data.statsError === null) {
      return;
    }

    setSelectedRange(range);
    const requestId = statsRequestId.current + 1;
    statsRequestId.current = requestId;
    setState((current) => {
      if (current.kind !== 'ready') {
        return current;
      }

      return {
        kind: 'ready',
        data: { ...current.data, statsLoading: true, statsError: null },
      };
    });

    fetchSpotifyStats(range)
      .then((stats) => {
        if (statsRequestId.current !== requestId) {
          return;
        }

        setState((current) => (
          current.kind === 'ready'
            ? { kind: 'ready', data: { ...current.data, stats, statsLoading: false, statsError: null } }
            : current
        ));
      })
      .catch(() => {
        if (statsRequestId.current !== requestId) {
          return;
        }

        setState((current) => (
          current.kind === 'ready'
            ? {
              kind: 'ready',
              data: {
                ...current.data,
                statsLoading: false,
                statsError: `unable to load ${timeRangeLabel(range)}. try again`,
              },
            }
            : current
        ));
      });
  }

  return (
    <section className={styles.music} aria-label="music">
      {renderMusicState(state, selectedRange, changeRange)}
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '@/components/SpotifyStats.module.css';
import { SpotifyTrackFeature } from '@/components/SpotifyTrackFeature';
import { fetchSpotifyNow, type SpotifyNow as SpotifyNowData } from '@/lib/spotify';

type SpotifyNowState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly now: SpotifyNowData }
  | { readonly kind: 'error' };

function assertNever(value: never): never {
  throw new Error(`Unexpected Spotify state: ${JSON.stringify(value)}`);
}

function playbackLabel(now: SpotifyNowData): string {
  switch (now.playbackKind) {
    case 'current':
      return 'currently playing';
    case 'recent':
      return 'last played';
    case 'empty':
      return 'spotify';
    default:
      return assertNever(now.playbackKind);
  }
}

function unavailableCopy(now: SpotifyNowData): string {
  switch (now.status) {
    case 'not_configured':
      return 'spotify is not connected on this backend yet.';
    case 'reauthorization_required':
      return 'spotify authorization needs refreshing.';
    case 'ok':
      return 'spotify returned no active or recent track.';
    default:
      return assertNever(now.status);
  }
}

function ReadyNow({ now }: { readonly now: SpotifyNowData }) {
  if (now.status !== 'ok' || now.track === null) {
    return <p className={styles.empty}>{unavailableCopy(now)}</p>;
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
    />
  );
}

function renderSpotifyState(state: SpotifyNowState) {
  switch (state.kind) {
    case 'loading':
      return <p className={styles.empty}>checking spotify.</p>;
    case 'ready':
      return <ReadyNow now={state.now} />;
    case 'error':
      return <p className={styles.empty}>not playing.</p>;
    default:
      return assertNever(state);
  }
}

export default function SpotifyNow() {
  const [state, setState] = useState<SpotifyNowState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function loadSpotifyNow() {
      try {
        const now = await fetchSpotifyNow();
        if (!cancelled) {
          setState({ kind: 'ready', now });
        }
      } catch {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      }
    }

    loadSpotifyNow();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={styles.spotify} aria-labelledby="spotify-title">
      <div className={styles.header}>
        <h2 id="spotify-title">listening now</h2>
        <span>{state.kind === 'ready' ? playbackLabel(state.now) : 'spotify'}</span>
      </div>

      {renderSpotifyState(state)}

      <Link className={styles.musicLink} href="/music">
        more music
      </Link>
    </section>
  );
}

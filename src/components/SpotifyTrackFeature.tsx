import Image from 'next/image';
import styles from '@/components/SpotifyStats.module.css';

type SpotifyTrackFeatureProps = {
  readonly label: string;
  readonly title: string;
  readonly artists: readonly string[];
  readonly album: string;
  readonly url: string | null;
  readonly imageUrl: string | null;
  readonly fallback: string;
  readonly emphasizeLabel?: boolean;
  readonly progressMs?: number | null;
  readonly durationMs?: number | null;
};

export function formatArtists(artists: readonly string[]): string {
  return artists.length > 0 ? artists.join(', ') : 'unknown artist';
}

function formatPlaybackTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function PlaybackProgress({
  progressMs,
  durationMs,
}: {
  readonly progressMs: number;
  readonly durationMs: number;
}) {
  const progress = Math.min(Math.max(progressMs, 0), durationMs);
  const percent = (progress / durationMs) * 100;

  return (
    <span className={styles.progress} aria-label={`${formatPlaybackTime(progress)} of ${formatPlaybackTime(durationMs)}`}>
      <span className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressFill} style={{ width: `${percent}%` }} />
      </span>
      <span className={styles.progressTime}>
        {formatPlaybackTime(progress)} / {formatPlaybackTime(durationMs)}
      </span>
    </span>
  );
}

function renderArtwork(track: SpotifyTrackFeatureProps) {
  if (track.imageUrl) {
    return (
      <Image
        src={track.imageUrl}
        width="64"
        height="64"
        alt={`${track.album} cover`}
        unoptimized
      />
    );
  }

  return <span>{track.fallback}</span>;
}

export function SpotifyTrackFeature(track: SpotifyTrackFeatureProps) {
  const content = (
    <>
      <span className={styles.art}>{renderArtwork(track)}</span>
      <span className={styles.featureCopy}>
        <span className={`${styles.label} ${track.emphasizeLabel ? styles.emphasis : ''}`}>{track.label}</span>
        <strong className={styles.title}>{track.title}</strong>
        {track.progressMs !== null &&
        track.progressMs !== undefined &&
        track.durationMs !== null &&
        track.durationMs !== undefined &&
        track.durationMs > 0 ? (
          <PlaybackProgress progressMs={track.progressMs} durationMs={track.durationMs} />
        ) : null}
        <span className={styles.meta}>{formatArtists(track.artists)}</span>
      </span>
    </>
  );

  if (track.url) {
    return (
      <a
        className={styles.feature}
        href={track.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${track.label}: ${track.title} by ${formatArtists(track.artists)}`}
      >
        {content}
      </a>
    );
  }

  return <div className={styles.feature}>{content}</div>;
}

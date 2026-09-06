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
};

export function formatArtists(artists: readonly string[]): string {
  return artists.length > 0 ? artists.join(', ') : 'unknown artist';
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
      >
        {content}
      </a>
    );
  }

  return <div className={styles.feature}>{content}</div>;
}

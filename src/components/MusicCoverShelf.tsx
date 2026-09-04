import Image from 'next/image';
import styles from '@/components/SpotifyStats.module.css';

export type MusicCoverItem = {
  readonly key: string;
  readonly rank: number;
  readonly title: string;
  readonly subtitle: string;
  readonly meta: string;
  readonly imageUrl: string | null;
  readonly url: string | null;
  readonly fallback: string;
};

function CoverArt({ item }: { readonly item: MusicCoverItem }) {
  if (item.imageUrl) {
    return (
      <Image
        src={item.imageUrl}
        width="220"
        height="220"
        alt={`${item.title} cover`}
        unoptimized
      />
    );
  }

  return <span className={styles.coverFallback}>{item.fallback}</span>;
}

function CoverTile({
  item,
  showMeta,
}: {
  readonly item: MusicCoverItem;
  readonly showMeta: boolean;
}) {
  const content = (
    <>
      <span className={styles.coverArt}>
        <CoverArt item={item} />
        <span className={styles.coverRank}>{item.rank}</span>
      </span>
      <span className={styles.coverCaption}>
        <strong>{item.title}</strong>
        <span>{item.subtitle}</span>
        {showMeta ? <em>{item.meta}</em> : null}
      </span>
    </>
  );

  if (item.url) {
    return (
      <a
        className={styles.coverTile}
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${item.title} by ${item.subtitle}`}
      >
        {content}
      </a>
    );
  }

  return <span className={styles.coverTile}>{content}</span>;
}

export default function MusicCoverShelf({
  items,
  empty,
  variant = 'wall',
  showMeta = false,
}: {
  readonly items: readonly MusicCoverItem[];
  readonly empty: string;
  readonly variant?: 'wall' | 'compact' | 'tagged';
  readonly showMeta?: boolean;
}) {
  if (items.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  const shelfClassName =
    variant === 'compact'
      ? `${styles.coverShelf} ${styles.coverShelfCompact}`
      : variant === 'tagged'
        ? `${styles.coverShelf} ${styles.coverShelfTagged}`
        : `${styles.coverShelf} ${styles.coverShelfWall}`;

  return (
    <div className={shelfClassName}>
      {items.map((item) => (
        <CoverTile key={item.key} item={item} showMeta={showMeta} />
      ))}
    </div>
  );
}

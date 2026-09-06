import Image from 'next/image';
import styles from '@/components/SpotifyStats.module.css';

export type MusicCoverItem = {
  readonly key: string;
  readonly title: string;
  readonly subtitle: string;
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

function CoverTile({ item }: { readonly item: MusicCoverItem }) {
  const content = (
    <>
      <span className={styles.coverArt}>
        <CoverArt item={item} />
      </span>
      <span className={styles.coverCaption}>
        <strong>{item.title}</strong>
        {item.subtitle ? <span>{item.subtitle}</span> : null}
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
        aria-label={item.subtitle ? `${item.title} by ${item.subtitle}` : item.title}
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
}: {
  readonly items: readonly MusicCoverItem[];
  readonly empty: string;
}) {
  if (items.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  return (
    <div className={styles.coverShelf}>
      {items.map((item) => <CoverTile key={item.key} item={item} />)}
    </div>
  );
}

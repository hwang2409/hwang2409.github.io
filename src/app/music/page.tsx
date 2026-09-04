import type { Metadata } from 'next';
import MusicStats from '@/components/MusicStats';
import styles from '@/components/SpotifyStats.module.css';
import ManualChrome from '@/components/ManualChrome';

export const metadata: Metadata = {
  title: 'music',
};

export default function MusicPage() {
  return (
    <>
    <ManualChrome name="HENRY-MUSIC(7)" title="Miscellaneous Manual" status="henry-music(7) — not playing" />
    <section className={`${styles.musicPage} page-section`}>
      <header className={styles.musicPageIntro}>
        <h1 className="page-title">music</h1>
        <p className="man-indent page-note">current playback and recent listening signals.</p>
      </header>
      <MusicStats />
    </section>
    </>
  );
}

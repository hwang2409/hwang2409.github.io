'use client';

import MusicStats from '@/components/MusicStats';
import styles from '@/components/SpotifyStats.module.css';

export default function MusicPageClient() {
  return (
    <>
      <section className={`${styles.musicPage} page-section`}>
        <header className={styles.musicPageIntro}>
          <h1 className="page-title">music</h1>
          <p className="page-note">current playback and recent listening signals.</p>
        </header>
        <MusicStats />
      </section>
    </>
  );
}

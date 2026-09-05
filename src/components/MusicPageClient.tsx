'use client';

import { useState } from 'react';
import ManualChrome from '@/components/ManualChrome';
import MusicStats from '@/components/MusicStats';
import styles from '@/components/SpotifyStats.module.css';
import type { SpotifyNow } from '@/lib/spotify';

function statusLabel(now: SpotifyNow | null): string {
  if (now?.playbackKind === 'current' && now.track) {
    return `henry-music(7) — now playing: ${now.track.title}`;
  }

  return 'henry-music(7) — not playing';
}

export default function MusicPageClient() {
  const [now, setNow] = useState<SpotifyNow | null>(null);

  return (
    <>
      <ManualChrome name="HENRY-MUSIC(7)" title="Miscellaneous Manual" status={statusLabel(now)} currentSection="music" sectionHref="/music" />
      <section className={`${styles.musicPage} page-section`}>
        <header className={styles.musicPageIntro}>
          <h1 className="page-title">music</h1>
          <p className="man-indent page-note">current playback and recent listening signals.</p>
        </header>
        <MusicStats onNowChange={setNow} />
      </section>
    </>
  );
}

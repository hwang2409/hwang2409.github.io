'use client';

import { useState } from 'react';
import MusicStats from '@/components/MusicStats';
import StatusLine from '@/components/StatusLine';
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
      <div className="man-header" aria-label="HENRY-MUSIC(7) manual page">
        <span>HENRY-MUSIC(7)</span>
        <span className="man-header-title">Miscellaneous Manual</span>
        <span className="man-header-right">HENRY-MUSIC(7)</span>
      </div>
      <StatusLine label={statusLabel(now)} />
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

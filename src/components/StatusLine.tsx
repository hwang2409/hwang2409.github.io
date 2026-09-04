'use client';

import { useEffect, useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

type Position = { current: number; total: number; percent: number; atEnd: boolean };

function readPosition(): Position {
  const lineHeight = 14 * 1.75;
  const total = Math.max(1, Math.ceil(document.documentElement.scrollHeight / lineHeight));
  const current = Math.min(total, Math.max(1, Math.ceil((window.scrollY + 1) / lineHeight)));
  const percent = total <= 1 ? 100 : Math.min(100, Math.round((current / total) * 100));
  return { current, total, percent, atEnd: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2 };
}

export default function StatusLine({ label }: { readonly label: string }) {
  const [position, setPosition] = useState<Position>({ current: 1, total: 1, percent: 100, atEnd: true });

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setPosition(readPosition());
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    const observer = new ResizeObserver(onScroll);
    observer.observe(document.body);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="statusline">
      <span className="statusline-label">{label}</span>
      <span className="statusline-right">
        <span className="statusline-position">
          line {position.current}/{position.total} {position.atEnd ? '(END)' : `(${position.percent}%)`}
          <span className="statusline-cursor" aria-hidden="true" />
        </span>
        <ThemeToggle />
      </span>
    </div>
  );
}

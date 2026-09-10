'use client';

import { useCallback, useState } from 'react';
import { createClock } from '@/lib/physics/scene';
import InteractiveCanvas from './InteractiveCanvas';
import { PauseButton, Slider, WidgetControls } from './WidgetControls';
import { clearCanvas } from './canvas';
import colors from './colors';
import styles from './PufferWidgets.module.css';

function session() {
  return { clock: createClock(1 / 30), rate: 3, threshold: 6, paused: false, credit: 0, writes: 0,
    wal: 0, segments: [] as number[], compacted: 0, phase: 'ready for writes' };
}
export default function WalSegmentWidget() {
  const [runtime] = useState(session);
  const [revision, setRevision] = useState(0);
  const [reset, setReset] = useState(0);
  const update = () => setRevision(n => n + 1);
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
    if (!staticPreview) runtime.clock(elapsed, () => {
      if (runtime.paused || runtime.segments.length >= 8) return;
      runtime.credit += runtime.rate / 30;
      if (runtime.credit < 1) return;
      runtime.credit -= 1;
      runtime.wal += 1; runtime.writes += 1;
      runtime.phase = `write ${runtime.writes}: WAL + manifest persisted`;
      if (runtime.wal >= runtime.threshold) {
        runtime.segments.push(runtime.wal); runtime.wal = 0;
        runtime.phase = 'segment published; manifest swapped; WAL retired';
      }
    });
    clearCanvas(ctx, width, height);
    ctx.fillText(`acknowledged writes: ${runtime.writes}`, 12, 22);
    ctx.fillText(`WAL tail: ${runtime.wal}`, 12, 58);
    for (let i = 0; i < runtime.wal; i += 1) {
      ctx.fillStyle = colors.foreground; ctx.fillRect(12 + i * (width - 24) / 12, 72, (width - 24) / 12 - 4, 24);
    }
    ctx.fillStyle = colors.foreground;
    ctx.fillText('immutable segments', 12, 130);
    const columns = width < 500 ? 4 : 8;
    runtime.segments.forEach((count, i) => {
      const x = 12 + (i % columns) * (width - 24) / columns, y = 146 + Math.floor(i / columns) * 50;
      ctx.fillStyle = colors.code; ctx.fillRect(x, y, (width - 24) / columns - 5, 40);
      ctx.strokeStyle = colors.border; ctx.strokeRect(x, y, (width - 24) / columns - 5, 40);
      ctx.fillStyle = colors.foreground; ctx.fillText(String(count), x + 8, y + 25);
    });
    ctx.fillText(`compacted documents: ${runtime.compacted}`, 12, height - 55);
    const message = runtime.segments.length >= 8 ? '8 segments: compact to continue' : runtime.phase;
    // Split long operational text on narrow canvases without shrinking the font.
    const words = message.split(' ');
    let line = '', y = height - 30;
    for (const word of words) {
      if (ctx.measureText(`${line} ${word}`).width > width - 24) { ctx.fillText(line, 12, y); line = ''; y += 15; }
      line += `${line ? ' ' : ''}${word}`;
    }
    ctx.fillText(line, 12, y);
  }, [runtime]);
  return <section className={`project-widget ${styles.scene}`} aria-label="WAL and segment lifecycle">
    <InteractiveCanvas draw={draw} redrawKey={revision} resetKey={reset} hint="writes fill the WAL tail. reaching the threshold publishes a segment. compact merges the stored segments." aria-label="WAL tail, immutable segments, and compaction counts" />
    <WidgetControls label="writes" actions={<>
      <PauseButton paused={runtime.paused} onClick={() => { runtime.paused = !runtime.paused; update(); }} />
      <button type="button" onClick={() => {
        if (runtime.segments.length < 2) return;
        runtime.compacted = runtime.segments.reduce((sum, count) => sum + count, 0);
        runtime.segments = [runtime.compacted];
        runtime.phase = 'merged segment published; old segments retired'; update();
      }}>[compact]</button>
      <button type="button" onClick={() => { Object.assign(runtime, session()); setReset(n => n + 1); update(); }}>[reset]</button>
    </>} note="insert-only model; numbers inside segments are document counts. the demo pauses at eight segments. Rust also handles updates, tombstones, failures, and automatic compaction.">
      <Slider label="writes / second" valueText={String(runtime.rate)} min={1} max={10} value={runtime.rate} onChange={e => { runtime.rate = Number(e.target.value); update(); }} />
      <Slider label="flush threshold" valueText={`${runtime.threshold} documents`} min={2} max={12} value={runtime.threshold} onChange={e => { runtime.threshold = Number(e.target.value); update(); }} />
    </WidgetControls>
  </section>;
}

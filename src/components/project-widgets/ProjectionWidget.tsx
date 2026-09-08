'use client';

import { useMemo, useState } from 'react';
import { renderProjection, type Projection } from '@/lib/raster/cameraProjection';
import InteractiveCanvas from './InteractiveCanvas';
import { clearCanvas } from './canvas';
import { rasterPainter } from './rasterCanvas';
import styles from './RasterWidgets.module.css';

export default function ProjectionWidget() {
  const [mode, setMode] = useState<Projection>('perspective');
  const [fov, setFov] = useState(60);
  const [revision, setRevision] = useState(0);
  const paint = useMemo(() => rasterPainter(renderProjection(mode, fov)), [mode, fov]);
  const draw = useMemo(() => (context: CanvasRenderingContext2D, width: number, height: number) => {
    clearCanvas(context, width, height);
    const w = Math.min(width, height * 4 / 3);
    paint(context, (width - w) / 2, (height - w * 3 / 4) / 2, w, w * 3 / 4);
  }, [paint]);

  return <section className={`project-widget ${styles.widget}`} aria-label="orthographic and perspective projection">
    <InteractiveCanvas draw={draw} resetKey={revision}
      aria-label={`six equal frames in a corridor under ${mode} projection`} />
    <div className="project-widget-controls">
      <button type="button" aria-pressed={mode === 'orthographic'} onClick={() => setMode('orthographic')}>[orthographic]</button>
      <button type="button" aria-pressed={mode === 'perspective'} onClick={() => setMode('perspective')}>[perspective]</button>
      <button type="button" onClick={() => { setMode('perspective'); setFov(60); setRevision((v) => v + 1); }}>[reset]</button>
      <div className={styles.sliders}><label>field of view: {mode === 'perspective' ? `${fov}°` : 'perspective only'}
        <input type="range" min={35} max={95} step={1} value={fov} disabled={mode === 'orthographic'} onChange={(e) => setFov(e.currentTarget.valueAsNumber)} />
      </label></div>
    </div>
    <p className="project-widget-hint">all six frames have equal dimensions. orthographic keeps parallel rails; perspective makes the far frames smaller. field of view changes the crop.</p>
  </section>;
}

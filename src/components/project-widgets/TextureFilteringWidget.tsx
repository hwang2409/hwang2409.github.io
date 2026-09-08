'use client';

import { useMemo, useState } from 'react';
import { renderFiltering } from '@/lib/raster/textureFiltering';
import InteractiveCanvas from './InteractiveCanvas';
import { clearCanvas } from './canvas';
import { rasterPainter } from './rasterCanvas';
import styles from './RasterWidgets.module.css';

export default function TextureFilteringWidget() {
  const [zoom, setZoom] = useState(2);
  const [revision, setRevision] = useState(0);
  const nearest = useMemo(() => rasterPainter(renderFiltering(zoom, false)), [zoom]);
  const bilinear = useMemo(() => rasterPainter(renderFiltering(zoom, true)), [zoom]);
  const draw = useMemo(() => (context: CanvasRenderingContext2D, width: number, height: number) => {
    clearCanvas(context, width, height);
    const half = width / 2, size = Math.min(half - 16, height - 56);
    const top = 36 + (height - 48 - size) / 2;
    nearest(context, (half - size) / 2, top, size, size);
    bilinear(context, half + (half - size) / 2, top, size, size);
    context.textAlign = 'center';
    context.fillText('nearest', half / 2, 24);
    context.fillText('bilinear', half * 1.5, 24);
  }, [nearest, bilinear]);

  return <section className={`project-widget ${styles.widget}`} aria-label="texture filtering comparison">
    <InteractiveCanvas draw={draw} resetKey={revision}
      aria-label="the same magnified ring texture: nearest on the left, bilinear on the right" />
    <div className="project-widget-controls">
      <div className={styles.sliders}><label>zoom: {zoom.toFixed(1)}×
        <input type="range" min={1} max={8} step={0.1} value={zoom} onChange={(e) => setZoom(e.currentTarget.valueAsNumber)} />
      </label></div>
      <button type="button" onClick={() => { setZoom(2); setRevision((v) => v + 1); }}>[reset]</button>
    </div>
    <p className="project-widget-hint">zoom into the ring’s edge. nearest keeps hard texel boundaries; bilinear blends four neighbors in linear light.</p>
  </section>;
}

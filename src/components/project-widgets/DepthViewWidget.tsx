'use client';

import { useMemo, useRef, useState } from 'react';
import { Scene } from '@/lib/raster/scene';
import InteractiveCanvas from './InteractiveCanvas';
import { clearCanvas } from './canvas';
import { scenePainter } from './sceneCanvas';
import styles from './RasterWidgets.module.css';

export default function DepthViewWidget() {
  const [depth, setDepth] = useState(false);
  const [distance, setDistance] = useState(4.8);
  const [revision, setRevision] = useState(0);
  const scene = useMemo(() => new Scene(), []);
  const paint = useMemo(() => scenePainter(scene), [scene]);
  const readout = useRef<HTMLParagraphElement>(null);
  const draw = useMemo(() => {
    let prepared = false;
    return (context: CanvasRenderingContext2D, width: number, height: number) => {
      if (!prepared) {
        scene.orbit('blinn-phong', 0.6, 0.05, 0.18, distance);
        scene.raster.render(); prepared = true;
      }
      clearCanvas(context, width, height);
      const w = Math.min(width, height * 4 / 3);
      paint(context, (width - w) / 2, (height - w * 3 / 4) / 2, w, w * 3 / 4, depth);
      if (readout.current) readout.current.textContent = `near 0.5 → far 12 · ${scene.raster.shaded} pixels shaded`;
    };
  }, [scene, paint, distance, depth]);
  return <section className={`project-widget ${styles.widget}`} aria-label="depth buffer view">
    <InteractiveCanvas resetKey={revision} draw={draw}
      aria-label={depth ? 'linearized depth buffer: near is dark, far is light' : 'three overlapping lit meshes'} />
    <div className="project-widget-controls">
      <button type="button" aria-pressed={!depth} onClick={() => setDepth(false)}>[color buffer]</button>
      <button type="button" aria-pressed={depth} onClick={() => setDepth(true)}>[z-buffer]</button>
      <button type="button" onClick={() => { setDepth(false); setDistance(4.8); setRevision((v) => v + 1); }}>[reset]</button>
      <div className={styles.sliders}><label>camera dolly: {distance.toFixed(1)} units
        <input type="range" min={3} max={8} step={0.1} value={distance} onChange={(e) => setDistance(e.currentTarget.valueAsNumber)} />
      </label></div>
    </div>
    <p className={styles.readout} ref={readout} />
    <p className="project-widget-hint">the same stored depths drive both views. grayscale linearizes depth: near is dark, far is light, untouched pixels are white.</p>
  </section>;
}

'use client';

import { useMemo, useState } from 'react';
import { Scene } from '@/lib/raster/scene';
import InteractiveCanvas from './InteractiveCanvas';
import { WidgetControls, ControlGroup, Slider } from './WidgetControls';
import { clearCanvas } from './canvas';
import { scenePainter } from './sceneCanvas';
import styles from './RasterWidgets.module.css';

export default function DepthViewWidget() {
  const [depth, setDepth] = useState(false);
  const [distance, setDistance] = useState(4.8);
  const scene = useMemo(() => new Scene(), []);
  const paint = useMemo(() => scenePainter(scene), [scene]);
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
    };
  }, [scene, paint, distance, depth]);
  return <section className={`project-widget ${styles.widget}`} aria-label="depth buffer view">
    <InteractiveCanvas hint="switch buffers" draw={draw}
      aria-label={depth ? 'linearized depth buffer: near is dark, far is light' : 'three overlapping lit meshes'} />
    <WidgetControls>
      <ControlGroup>
        <Slider label="camera dolly" valueText={`${distance.toFixed(1)} units`} min={3} max={8} step={0.1} value={distance}
          onChange={(e) => setDistance(e.currentTarget.valueAsNumber)} />
      </ControlGroup>
      <ControlGroup>
        <button type="button" aria-pressed={!depth} onClick={() => setDepth(false)}>[color buffer]</button>
        <button type="button" aria-pressed={depth} onClick={() => setDepth(true)}>[z-buffer]</button>
      </ControlGroup>
    </WidgetControls>
  </section>;
}

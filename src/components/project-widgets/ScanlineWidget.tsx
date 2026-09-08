'use client';

import { useMemo, useRef, useState } from 'react';
import { Scene } from '@/lib/raster/scene';
import InteractiveCanvas from './InteractiveCanvas';
import { ControlGroup, Slider } from './WidgetControls';
import { clearCanvas } from './canvas';
import colors from './colors';
import { scenePainter } from './sceneCanvas';
import styles from './RasterWidgets.module.css';

export default function ScanlineWidget() {
  const [speed, setSpeed] = useState(30);
  const [paused, setPaused] = useState(false);
  const [rejection, setRejection] = useState(true);
  const [steps, setSteps] = useState(0);
  const [revision, setRevision] = useState(0);
  const scene = useMemo(() => {
    const result = new Scene(192, 144);
    result.orbit('blinn-phong', 0.6, 0.05, 0.18, 4.8);
    return result;
  }, []);
  const paint = useMemo(() => scenePainter(scene), [scene]);
  const progress = useRef({ line: 0, fraction: 0, steps: 0, previewed: false });
  const readout = useRef<HTMLParagraphElement>(null);
  const draw = useMemo(() => {
    let previous = 0;
    return (context: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
      const p = progress.current, raster = scene.raster;
      const time = Math.max(0, elapsed);
      const delta = Math.max(0, time - previous);
      previous = time;
      let lines = Math.max(0, steps - p.steps);
      p.steps = steps;
      if (staticPreview && !p.previewed && p.line === 0 && !paused) {
        lines = Math.floor(raster.height / 2); p.previewed = true;
      } else if (!paused && !staticPreview) {
        p.fraction += delta * speed / 1000;
        lines += Math.floor(p.fraction); p.fraction %= 1;
      }
      const end = Math.min(raster.height, p.line + lines);
      while (p.line < end) { raster.scanline(p.line); p.line += 1; }
      clearCanvas(context, width, height);
      const w = Math.min(width, (height - 44) * raster.width / raster.height);
      const h = w * raster.height / raster.width;
      const x = (width - w) / 2;
      paint(context, x, 0, w, h, false, rejection);
      const row = Math.max(0, p.line - 1), y = (row + 0.5) * h / raster.height;
      context.strokeStyle = colors.muted;
      context.setLineDash([4, 4]);
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + w, y); context.stroke();
      context.setLineDash([]);
      // A magnified record of actual depth-test failures on the current row.
      for (let col = 0; col < raster.width; col += 1) {
        const index = row * raster.width + col;
        context.fillStyle = raster.rejected[index] ? colors.foreground : colors.border;
        context.fillRect(x + col * w / raster.width, height - 29, w / raster.width + 0.5, 8);
      }
      context.fillStyle = colors.muted;
      context.fillText('black strip = rejected fragments', 8, height - 7);
      if (readout.current) readout.current.textContent = `line ${p.line} / ${raster.height} · ${raster.shaded} shaded · ${raster.rejectedCount} rejected${p.line === raster.height ? ' · complete' : ''}`;
    };
  }, [scene, paint, speed, paused, rejection, steps]);

  return <section className={`project-widget ${styles.widget}`} aria-label="scanline theater">
    <InteractiveCanvas hint="pause, then step one line · show rejected fragments to inspect depth tests" draw={draw} resetKey={revision} aria-label="a frame fills one scanline at a time; hatching marks pixels with rejected depth tests" />
    <div className="project-widget-controls">
      <ControlGroup label="playback" actions={<><button type="button" onClick={() => setPaused(!paused)}>[{paused ? 'play' : 'pause'}]</button>
        <button type="button" onClick={() => { setPaused(true); setSteps((v) => v + 1); }}>[step one line]</button>
        <button type="button" onClick={() => {
          scene.raster.clear(); progress.current = { line: 0, fraction: 0, steps: 0, previewed: false };
          setSpeed(30); setPaused(false); setRejection(true); setSteps(0); setRevision((v) => v + 1);
        }}>[reset demo]</button></>}>
        <Slider label="speed" valueText={`${speed} lines / second`} min={1} max={144} value={speed}
          onChange={(e) => setSpeed(e.currentTarget.valueAsNumber)} />
      </ControlGroup>
      <ControlGroup label="view">
        <button type="button" aria-pressed={rejection} onClick={() => setRejection(!rejection)}>[show rejected]</button>
      </ControlGroup>
    </div>
    <p className="project-widget-readout" ref={readout} />
    <p className="project-widget-note">the near mesh arrives first. hidden fragments from later meshes fail the depth test. hatching records those attempts.</p>
  </section>;
}

'use client';

import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { stages, type Stage } from '@/lib/raster/pipeline';
import { Scene } from '@/lib/raster/scene';
import { clamp } from '@/lib/raster/triangle';
import InteractiveCanvas from './InteractiveCanvas';
import { WidgetControls, PauseButton, ControlGroup, Slider } from './WidgetControls';
import { clearCanvas } from './canvas';
import { scenePainter } from './sceneCanvas';
import styles from './RasterWidgets.module.css';

const descriptions: Record<Stage, string> = {
  vertices: 'model → view → projection.',
  wireframe: 'hidden edges remain visible.',
  'backface-culled': 'discard faces pointing away from the camera.',
  flat: 'depth test per pixel; lighting per face.',
  gouraud: 'interpolate vertex lighting.',
  'blinn-phong': 'interpolate normals; light each pixel.',
};

export default function PipelineWidget() {
  const [stage, setStage] = useState<Stage>('blinn-phong');
  const [yaw, setYaw] = useState(15);
  const [pitch, setPitch] = useState(12);
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);
  const scene = useMemo(() => new Scene(), []);
  const paint = useMemo(() => scenePainter(scene), [scene]);
  const readout = useRef<HTMLParagraphElement>(null);
  const rotation = useRef(0);
  const dragging = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const draw = useMemo(() => {
    let previous = 0;
    return (context: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
      const time = Math.max(0, elapsed);
      if (!paused && !staticPreview) rotation.current += Math.min(350, Math.max(0, time - previous)) * 0.00035;
      previous = time;
      scene.orbit(stage, rotation.current, yaw * Math.PI / 180, pitch * Math.PI / 180, 4.8);
      scene.raster.render();
      clearCanvas(context, width, height);
      const w = Math.min(width, height * 4 / 3);
      paint(context, (width - w) / 2, (height - w * 3 / 4) / 2, w, w * 3 / 4);
      if (readout.current) readout.current.textContent = `${scene.raster.drawn} triangles drawn / ${scene.raster.culled} culled · ${scene.raster.shaded} pixels shaded`;
    };
  }, [scene, paint, stage, yaw, pitch, paused]);

  function drag(event: PointerEvent<HTMLCanvasElement>) {
    const start = dragging.current;
    if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setYaw(clamp(Math.round(start.yaw + (event.clientX - start.x) * 0.5), -180, 180));
    setPitch(clamp(Math.round(start.pitch + (event.clientY - start.y) * 0.4), -65, 65));
  }

  return <section className={`project-widget ${styles.widget}`} aria-label="3d rendering pipeline">
    <InteractiveCanvas hint="drag to orbit" className={`project-widget-draggable ${styles.flagship}`} draw={draw} resetKey={revision}
      aria-label="three rotating triangle meshes; drag to orbit, or use yaw and pitch below"
      onPointerDown={(event) => {
        if (event.button !== 0 || dragging.current) return;
        dragging.current = { x: event.clientX, y: event.clientY, yaw, pitch };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={drag}
      onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); dragging.current = null; }}
      onPointerCancel={() => { dragging.current = null; }} onLostPointerCapture={() => { dragging.current = null; }} />
    <WidgetControls readout={{ ref: readout }}
      note={descriptions[stage]}>
      <ControlGroup>
        <PauseButton paused={paused} onClick={() => setPaused(!paused)} />
        <button type="button" onClick={() => {
          setStage('blinn-phong'); setYaw(15); setPitch(12); setPaused(false); rotation.current = 0; setRevision((v) => v + 1);
        }}>[reset demo]</button>
      </ControlGroup>
      <ControlGroup>
        <Slider label="camera yaw" valueText={`${yaw}°`} min={-180} max={180} value={yaw}
          onChange={(e) => setYaw(e.currentTarget.valueAsNumber)} />
        <Slider label="camera pitch" valueText={`${pitch}°`} min={-65} max={65} value={pitch}
          onChange={(e) => setPitch(e.currentTarget.valueAsNumber)} />
      </ControlGroup>
      <ControlGroup label="render stage">
        {stages.map((value, index) => <button type="button" key={value} aria-pressed={stage === value} onClick={() => setStage(value)}>[{index + 1}. {value}]</button>)}
      </ControlGroup>
    </WidgetControls>
  </section>;
}

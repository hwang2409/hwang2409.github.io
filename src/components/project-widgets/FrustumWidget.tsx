'use client';

import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { objects, Scene } from '@/lib/raster/scene';
import { clamp } from '@/lib/raster/triangle';
import InteractiveCanvas from './InteractiveCanvas';
import { WidgetControls, Slider } from './WidgetControls';
import { clearCanvas } from './canvas';
import colors from './colors';
import { scenePainter } from './sceneCanvas';
import styles from './RasterWidgets.module.css';

export default function FrustumWidget() {
  const [yaw, setYaw] = useState(0);
  const dragging = useRef<{ x: number; yaw: number } | null>(null);
  const scene = useMemo(() => new Scene(), []);
  const readout = useRef<HTMLParagraphElement>(null);
  const paint = useMemo(() => scenePainter(scene), [scene]);
  const draw = useMemo(() => {
    let prepared = false;
    return (context: CanvasRenderingContext2D, width: number, height: number) => {
      if (!prepared) { scene.frustum(yaw * Math.PI / 180); prepared = true; }
      clearCanvas(context, width, height);
      const stacked = width < 520;
      const panelWidth = stacked ? width : width / 2;
      const panelHeight = stacked ? height / 2 : height;
      const cx = panelWidth / 2, cy = panelHeight / 2 + 9;
      const scale = Math.min(panelWidth - 24, panelHeight - 40) / 34;
      const angle = yaw * Math.PI / 180;
      const halfWidth = Math.tan(Math.PI / 6) * scene.raster.width / scene.raster.height;
      const rightX = Math.cos(angle), rightZ = -Math.sin(angle);
      const forwardX = -Math.sin(angle), forwardZ = -Math.cos(angle);
      context.fillStyle = colors.border; context.strokeStyle = colors.muted;
      context.beginPath();
      for (let i = 0; i < 4; i += 1) {
        const distance = i < 2 ? scene.near : scene.far;
        const side = i === 0 || i === 3 ? -1 : 1;
        const x = cx + (forwardX + rightX * halfWidth * side) * distance * scale;
        const y = cy + (forwardZ + rightZ * halfWidth * side) * distance * scale;
        if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.closePath(); context.fill(); context.stroke();
      for (let i = 0; i < objects.length; i += 1) {
        const object = objects[i];
        context.beginPath(); context.arc(cx + object.x * scale, cy + object.z * scale, Math.max(2, object.radius * scale), 0, Math.PI * 2);
        context.fillStyle = scene.visible[i] ? colors.foreground : colors.background;
        context.fill(); context.stroke();
      }
      context.fillStyle = colors.foreground; context.fillRect(cx - 2, cy - 2, 4, 4);
      context.fillText('top view', 8, 18);
      const px = stacked ? 0 : panelWidth, py = stacked ? panelHeight : 0;
      const h = Math.min(panelHeight - 32, panelWidth * 3 / 4), w = h * 4 / 3;
      paint(context, px + (panelWidth - w) / 2, py + (panelHeight - h) / 2 + 8, w, h);
      context.fillStyle = colors.foreground; context.fillText('camera view', px + 8, py + 18);
      if (readout.current) readout.current.textContent = `${scene.drawnObjects} objects drawn / ${objects.length - scene.drawnObjects} culled`;
    };
  }, [scene, paint, yaw]);
  function drag(event: PointerEvent<HTMLCanvasElement>) {
    const start = dragging.current;
    if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setYaw(clamp(Math.round(start.yaw + (event.clientX - start.x) * 0.7), -180, 180));
  }
  return <section className={`project-widget ${styles.widget}`} aria-label="frustum culling split view">
    <InteractiveCanvas hint="drag to turn the camera" className={`project-widget-draggable ${styles.splitCanvas}`}
      aria-label="top-down camera frustum and matching first-person view; drag horizontally or use camera yaw below"
      onPointerDown={(event) => {
        if (event.button !== 0 || dragging.current) return;
        dragging.current = { x: event.clientX, yaw }; event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={drag}
      onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); dragging.current = null; }}
      onPointerCancel={() => { dragging.current = null; }} onLostPointerCapture={() => { dragging.current = null; }}
      draw={draw} />
    <WidgetControls readout={{ ref: readout }}
      note="filled: kept; hollow: culled. bounds touching a frustum plane stay.">
      <Slider label="camera yaw" valueText={`${yaw}°`} min={-180} max={180} value={yaw}
        onChange={(e) => setYaw(e.currentTarget.valueAsNumber)} />
    </WidgetControls>
  </section>;
}

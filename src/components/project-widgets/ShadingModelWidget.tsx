'use client';

import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { clamp } from '@/lib/raster/triangle';
import { lightDirection, renderSphere, sphereRadius, sphereSize, type ShadingMode } from '@/lib/raster/shading';
import InteractiveCanvas from './InteractiveCanvas';
import colors from './colors';
import { clearCanvas } from './canvas';
import { rasterPainter } from './rasterCanvas';
import styles from './RasterWidgets.module.css';

const modes: ShadingMode[] = ['flat', 'gouraud', 'blinn-phong'];

function sphereBounds(width: number, height: number) {
  const size = Math.min(width - 32, height - 64);
  return { size, x: width / 2, y: 30 + size / 2, lightRadius: size * sphereRadius / sphereSize * 1.2 };
}

export default function ShadingModelWidget() {
  const [mode, setMode] = useState<ShadingMode>('blinn-phong');
  const [azimuth, setAzimuth] = useState(-35);
  const [elevation, setElevation] = useState(30);
  const [revision, setRevision] = useState(0);
  const dragging = useRef(false);
  const paint = useMemo(() => rasterPainter(renderSphere(mode, azimuth, elevation)), [mode, azimuth, elevation]);
  const light = lightDirection(azimuth, elevation);

  function dragLight(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const bounds = sphereBounds(rect.width, rect.height);
    let x = (event.clientX - rect.left - bounds.x) / bounds.lightRadius;
    let y = -(event.clientY - rect.top - bounds.y) / bounds.lightRadius;
    const length = Math.hypot(x, y);
    if (length > 0.98) { x *= 0.98 / length; y *= 0.98 / length; }
    const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    setAzimuth(clamp(Math.round(Math.atan2(x, z) * 180 / Math.PI), -85, 85));
    setElevation(clamp(Math.round(Math.asin(clamp(y, -1, 1)) * 180 / Math.PI), -75, 75));
    setRevision((v) => v + 1);
  }

  return (
    <section className={`project-widget ${styles.widget}`} aria-label="sphere shading and light direction">
      <InteractiveCanvas className="project-widget-draggable" aria-label="drag the light handle labeled l; equivalent light angle sliders follow"
        resetKey={revision}
        draw={(context, width, height) => {
          clearCanvas(context, width, height);
          const bounds = sphereBounds(width, height);
          paint(context, bounds.x - bounds.size / 2, bounds.y - bounds.size / 2, bounds.size, bounds.size);
          const x = bounds.x + light.x * bounds.lightRadius;
          const y = bounds.y - light.y * bounds.lightRadius;
          context.strokeStyle = colors.muted;
          context.setLineDash([3, 3]);
          context.beginPath();
          context.moveTo(bounds.x, bounds.y);
          context.lineTo(x, y);
          context.stroke();
          context.setLineDash([]);
          context.fillStyle = colors.background;
          context.strokeStyle = colors.foreground;
          context.beginPath();
          context.arc(x, y, 10, 0, Math.PI * 2);
          context.fill();
          context.stroke();
          context.fillStyle = colors.foreground;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText('l', x, y);
        }}
        onPointerDown={(event) => {
          if (event.button !== 0 || dragging.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const bounds = sphereBounds(rect.width, rect.height);
          const x = bounds.x + light.x * bounds.lightRadius;
          const y = bounds.y - light.y * bounds.lightRadius;
          if (Math.hypot(event.clientX - rect.left - x, event.clientY - rect.top - y) > 22) return;
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragLight(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current && event.currentTarget.hasPointerCapture(event.pointerId)) dragLight(event);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            dragging.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onLostPointerCapture={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }} />
      <div className="project-widget-controls">
        {modes.map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => {
          setMode(value); setRevision((v) => v + 1);
        }}>[{value}]</button>)}
        <div className={styles.sliders}>
          <label>light azimuth: {azimuth}°
            <input type="range" min={-85} max={85} step={1} value={azimuth} onChange={(event) => {
              setAzimuth(clamp(event.currentTarget.valueAsNumber, -85, 85)); setRevision((v) => v + 1);
            }} />
          </label>
          <label>light elevation: {elevation}°
            <input type="range" min={-75} max={75} step={1} value={elevation} onChange={(event) => {
              setElevation(clamp(event.currentTarget.valueAsNumber, -75, 75)); setRevision((v) => v + 1);
            }} />
          </label>
        </div>
      </div>
      <p className="project-widget-hint">drag l or change the light angles. flat lights each face; gouraud interpolates vertex light; blinn-phong lights each pixel.</p>
    </section>
  );
}

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import InteractiveCanvas from './InteractiveCanvas';
import colors from './colors';
import { simulateProjectile, type ProjectilePoint } from '@/lib/physics/integrators';

const duration = 2.5;
const dt = 0.17;

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number) {
  const floor = height - 34;
  context.strokeStyle = colors.border;
  context.lineWidth = 1;
  context.beginPath();
  for (let x = 0; x <= 3.5; x += 0.5) {
    const screenX = 54 + x * ((width - 74) / 3.5);
    context.moveTo(screenX, 20);
    context.lineTo(screenX, floor);
  }
  for (let y = 0; y <= 3; y += 0.5) {
    const screenY = floor - y * ((floor - 20) / 3);
    context.moveTo(54, screenY);
    context.lineTo(width - 20, screenY);
  }
  context.stroke();
  context.strokeStyle = colors.foreground;
  context.beginPath();
  context.moveTo(54, 20);
  context.lineTo(54, floor);
  context.lineTo(width - 20, floor);
  context.stroke();
}

function drawTrail(
  context: CanvasRenderingContext2D,
  points: ProjectilePoint[],
  width: number,
  height: number,
  color: string,
  dash: number[] = [],
) {
  const floor = height - 34;
  const scaleX = (width - 74) / 3.5;
  const scaleY = (floor - 20) / 3;
  context.strokeStyle = color;
  context.lineWidth = color === colors.foreground ? 2 : 1;
  context.setLineDash(dash);
  context.beginPath();
  points.forEach((point, index) => {
    const x = 54 + point.x * scaleX;
    const y = floor - point.y * scaleY;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.setLineDash([]);
}

function drawPoint(
  context: CanvasRenderingContext2D,
  point: ProjectilePoint,
  width: number,
  height: number,
  color: string,
) {
  const floor = height - 34;
  const x = 54 + point.x * ((width - 74) / 3.5);
  const y = floor - point.y * ((floor - 20) / 3);
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, 4, 0, Math.PI * 2);
  context.fill();
}

export default function IntegratorsWidget() {
  const [velocity, setVelocity] = useState({ x: 7, y: 8 });
  const [replayKey, setReplayKey] = useState(0);
  const dragging = useRef(false);
  const trails = useMemo(
    () => ({
      explicit: simulateProjectile(velocity, 'explicit', dt, duration),
      semiImplicit: simulateProjectile(velocity, 'semi-implicit', dt, duration),
      rk4: simulateProjectile(velocity, 'rk4', dt, duration),
    }),
    [velocity],
  );

  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, elapsed: number) => {
    context.fillStyle = colors.background;
    context.fillRect(0, 0, width, height);
    drawGrid(context, width, height);
    drawTrail(context, trails.explicit, width, height, colors.muted, [5, 4]);
    drawTrail(context, trails.semiImplicit, width, height, colors.foreground);
    drawTrail(context, trails.rk4, width, height, colors.muted, [1, 4]);

    const pointIndex = Math.min(Math.floor((elapsed / 1000) / dt), trails.rk4.length - 1);
    drawPoint(context, trails.explicit[Math.min(pointIndex, trails.explicit.length - 1)], width, height, colors.muted);
    drawPoint(context, trails.semiImplicit[Math.min(pointIndex, trails.semiImplicit.length - 1)], width, height, colors.foreground);
    drawPoint(context, trails.rk4[Math.min(pointIndex, trails.rk4.length - 1)], width, height, colors.muted);

    const originX = 54;
    const originY = height - 34;
    const handleX = originX + velocity.x * 13;
    const handleY = originY - velocity.y * 13;
    context.strokeStyle = colors.foreground;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(originX, originY);
    context.lineTo(handleX, handleY);
    context.stroke();
    context.fillStyle = colors.background;
    context.beginPath();
    context.arc(handleX, handleY, 7, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }, [trails, velocity]);

  const updateVelocity = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const originX = 54;
    const originY = bounds.height - 34;
    const nextX = Math.max(2, Math.min(10, (event.clientX - bounds.left - originX) / 13));
    const nextY = Math.max(2, Math.min(12, (originY - event.clientY + bounds.top) / 13));
    setVelocity({ x: nextX, y: nextY });
  };

  return (
    <section className="project-widget" aria-label="integrator comparison">
      <InteractiveCanvas
        aria-label="projectile trails for explicit euler, semi-implicit euler, and rk4"
        draw={draw}
        resetKey={replayKey}
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateVelocity(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) updateVelocity(event);
        }}
        onPointerUp={(event) => {
          dragging.current = false;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      />
      <div className="project-widget-legend" aria-label="integrator legend">
        <span><i className="legend-swatch legend-dashed" />explicit euler</span>
        <span><i className="legend-swatch legend-solid" />semi-implicit euler</span>
        <span><i className="legend-swatch legend-dotted" />rk4</span>
      </div>
      <div className="project-widget-controls">
        <span>drag the launch point</span>
        <span>velocity: {velocity.x.toFixed(1)}, {velocity.y.toFixed(1)} m/s</span>
        <button type="button" onClick={() => setReplayKey((value) => value + 1)}>[replay]</button>
      </div>
    </section>
  );
}

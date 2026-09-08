'use client';

import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { clamp, edge, interpolate, rasterize, type Point, type Triangle } from '@/lib/raster/triangle';
import InteractiveCanvas from './InteractiveCanvas';
import { ControlGroup } from './WidgetControls';
import colors from './colors';
import { clearCanvas } from './canvas';
import styles from './RasterWidgets.module.css';

const columns = 24;
const rows = 16;
const initial: Triangle = [{ x: 4, y: 3 }, { x: 21, y: 6 }, { x: 9, y: 14 }];
const names = ['a', 'b', 'c'];
type RasterCell = { x: number; y: number; gray: number };

function gridBounds(width: number, height: number) {
  const cell = Math.floor(Math.min((width - 48) / columns, (height - 72) / rows));
  return { cell, left: Math.floor((width - columns * cell) / 2), top: Math.floor((height - rows * cell) / 2) };
}

export default function TriangleRasterWidget() {
  const [vertices, setVertices] = useState(initial);
  const [revision, setRevision] = useState(0);
  const dragging = useRef<number | null>(null);
  const cells = useMemo(() => {
    const result: RasterCell[] = [];
    rasterize(vertices, columns, rows, (x, y, weights) => {
      result.push({ x, y, gray: Math.round(interpolate([45, 135, 225], weights)) });
    });
    return result;
  }, [vertices]);

  function updateVertex(index: number, point: Point) {
    const next = { x: clamp(Math.round(point.x), 0, columns), y: clamp(Math.round(point.y), 0, rows) };
    setVertices((previous) => [index === 0 ? next : previous[0], index === 1 ? next : previous[1], index === 2 ? next : previous[2]]);
    setRevision((value) => value + 1);
  }

  function pointerPosition(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const grid = gridBounds(bounds.width, bounds.height);
    return { x: (event.clientX - bounds.left - grid.left) / grid.cell, y: (event.clientY - bounds.top - grid.top) / grid.cell };
  }

  return (
    <section className={`project-widget ${styles.widget}`} aria-label="triangle coverage and barycentric weights">
      <InteractiveCanvas hint="drag a vertex · edit its coordinates for keyboard control"
        className="project-widget-draggable"
        aria-label="drag vertices a, b, and c; equivalent coordinate inputs follow"
        resetKey={revision}
        draw={(context, width, height) => {
          clearCanvas(context, width, height);
          const { cell, left, top } = gridBounds(width, height);
          for (const pixel of cells) {
            context.fillStyle = `rgb(${pixel.gray} ${pixel.gray} ${pixel.gray})`;
            context.fillRect(left + pixel.x * cell, top + pixel.y * cell, cell, cell);
          }
          context.strokeStyle = colors.border;
          context.beginPath();
          for (let x = 0; x <= columns; x += 1) {
            context.moveTo(left + x * cell + 0.5, top + 0.5);
            context.lineTo(left + x * cell + 0.5, top + rows * cell + 0.5);
          }
          for (let y = 0; y <= rows; y += 1) {
            context.moveTo(left + 0.5, top + y * cell + 0.5);
            context.lineTo(left + columns * cell + 0.5, top + y * cell + 0.5);
          }
          context.stroke();
          context.strokeStyle = colors.foreground;
          context.beginPath();
          vertices.forEach((p, index) => {
            const x = left + p.x * cell + 0.5;
            const y = top + p.y * cell + 0.5;
            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          });
          context.closePath();
          context.stroke();
          vertices.forEach((p, index) => {
            const x = left + p.x * cell;
            const y = top + p.y * cell;
            context.fillStyle = colors.background;
            context.beginPath();
            context.arc(x, y, 9, 0, Math.PI * 2);
            context.fill();
            context.stroke();
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = colors.foreground;
            context.fillText(names[index], x, y);
          });
        }}
        onPointerDown={(event) => {
          if (event.button !== 0 || dragging.current !== null) return;
          const point = pointerPosition(event);
          const bounds = event.currentTarget.getBoundingClientRect();
          const { cell } = gridBounds(bounds.width, bounds.height);
          let nearest = -1;
          let distance = Infinity;
          vertices.forEach((p, index) => {
            const d = Math.hypot(p.x - point.x, p.y - point.y) * cell;
            if (d < distance) { distance = d; nearest = index; }
          });
          if (distance > 22) return;
          dragging.current = nearest;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateVertex(nearest, point);
        }}
        onPointerMove={(event) => {
          if (dragging.current !== null && event.currentTarget.hasPointerCapture(event.pointerId)) {
            updateVertex(dragging.current, pointerPosition(event));
          }
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            dragging.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onLostPointerCapture={() => { dragging.current = null; }}
        onPointerCancel={() => { dragging.current = null; }}
      />
      <div className="project-widget-controls">
        <ControlGroup label="triangle">
          <button type="button" onClick={() => { setVertices(initial); setRevision((value) => value + 1); }}>[reset]</button>
        </ControlGroup>
        <ControlGroup label="coordinates">
          <div className={styles.vertices}>
            {vertices.map((p, index) => (
              <fieldset key={names[index]}>
                <legend>vertex {names[index]}</legend>
                {(['x', 'y'] as const).map((axis) => (
                  <label key={axis}>{axis}
                    <input type="number" min={0} max={axis === 'x' ? columns : rows} step={1} value={p[axis]}
                      onChange={(event) => {
                        const value = event.currentTarget.valueAsNumber;
                        if (Number.isFinite(value)) updateVertex(index, { ...p, [axis]: value });
                      }} />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </ControlGroup>
      </div>
      <div className="project-widget-readout"><output>{cells.length} covered pixels</output></div>
      <p className="project-widget-note">a is dark, b is gray, c is light; pixel centers decide coverage.</p>
      {Math.abs(edge(vertices[0], vertices[1], vertices[2])) < 1e-8 ? <p className="project-widget-readout">zero area: no pixels to fill</p> : null}
    </section>
  );
}

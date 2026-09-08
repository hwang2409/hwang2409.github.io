'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { pendulumPositions, simulatePendulum } from '@/lib/physics/pendulum';
import { sampleIndex } from '@/lib/physics/sampling';
import InteractiveCanvas from './InteractiveCanvas';
import { ControlGroup, Slider } from './WidgetControls';
import { clearCanvas } from './canvas';
import { drawPendulum, pendulumBounds, pendulumLayout } from './pendulumDrawing';

export default function PendulumTreeWidget() {
  const [angles, setAngles] = useState({ q1: 1.4, q2: -0.7 });
  const [replay, setReplay] = useState(0);
  const dragging = useRef<1 | 2 | null>(null);
  const current = useRef({ ...angles, v1: 0, v2: 0 });
  const trace = useMemo(() => simulatePendulum(angles.q1, angles.q2, 20), [angles]);
  const bounds = useMemo(() => pendulumBounds([trace]), [trace]);
  const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, elapsed: number) => {
    clearCanvas(context, width, height);
    const time = dragging.current ? 0 : Math.min(elapsed / 1000, trace[trace.length - 1].time);
    current.current = trace[sampleIndex(trace, time)];
    drawPendulum(context, trace, time, width, height, bounds);
    context.fillText('two hinges · q₂ relative to q₁', 16, 22);
    context.fillText(`t ${time.toFixed(2)} s`, 16, height - 16);
  }, [bounds, trace]);

  const changeAngle = (joint: 'q1' | 'q2', value: number) => {
    setAngles(a => ({ ...a, [joint]: value }));
    setReplay(r => r + 1);
  };
  const drag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragging.current === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const layout = pendulumLayout(rect.width, rect.height, bounds);
    const p = pendulumPositions(current.current);
    const pivotX = layout.x + (dragging.current === 2 ? p.x1 * layout.scale : 0);
    const pivotY = layout.y + (dragging.current === 2 ? p.y1 * layout.scale : 0);
    const angle = Math.atan2(event.clientX - rect.left - pivotX, event.clientY - rect.top - pivotY);
    const q1 = wrapAngle(current.current.q1);
    const q2 = wrapAngle(current.current.q2);
    setAngles(dragging.current === 1 ? { q1: angle, q2 } : { q1, q2: wrapAngle(angle - q1) });
    setReplay(r => r + 1);
  };
  const release = () => {
    dragging.current = null;
    setReplay(r => r + 1);
  };

  return (
    <section className="project-widget" aria-label="joint-space pendulum">
      <InteractiveCanvas hint="drag either link, then release · use joint sliders for keyboard control" draw={draw} resetKey={replay} className="project-widget-draggable" aria-label="two-link pendulum; drag a link or use the angle controls below"
        onPointerDown={event => {
          const rect = event.currentTarget.getBoundingClientRect();
          const layout = pendulumLayout(rect.width, rect.height, bounds);
          const p = pendulumPositions(current.current);
          const x = (event.clientX - rect.left - layout.x) / layout.scale;
          const y = (event.clientY - rect.top - layout.y) / layout.scale;
          // Choose the closest rod segment, not just its endpoint.
          const distance = (ax: number, ay: number, bx: number, by: number) => {
            const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
            return Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay));
          };
          dragging.current = distance(0, 0, p.x1, p.y1) < distance(p.x1, p.y1, p.x2, p.y2) ? 1 : 2;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag(event);
        }} onPointerMove={drag} onPointerUp={release} onPointerCancel={release} />
      <div className="project-widget-controls">
        <ControlGroup label="release">
          <button type="button" onClick={() => setReplay(r => r + 1)}>[replay]</button>
        </ControlGroup>
        <ControlGroup label="starting angles">
          <Slider label="joint 1" valueText={`${angles.q1.toFixed(2)} rad`} id="pendulum-q1" min={-Math.PI} max={Math.PI} step="0.01" value={angles.q1}
            onChange={e => changeAngle('q1', Number(e.target.value))} />
          <Slider label="joint 2" valueText={`${angles.q2.toFixed(2)} rad`} id="pendulum-q2" min={-Math.PI} max={Math.PI} step="0.01" value={angles.q2}
            onChange={e => changeAngle('q2', Number(e.target.value))} />
        </ControlGroup>
      </div>
    </section>
  );
}

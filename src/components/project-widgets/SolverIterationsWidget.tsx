'use client';

import { useCallback, useMemo, useState } from 'react';
import { simulateStack } from '@/lib/physics/stack';
import { sampleIndex } from '@/lib/physics/sampling';
import InteractiveCanvas from './InteractiveCanvas';
import { ControlGroup, Slider } from './WidgetControls';
import { clearCanvas, crisp } from './canvas';
import colors from './colors';

export default function SolverIterationsWidget() {
  const [iterations, setIterations] = useState(1);
  const [replay, setReplay] = useState(0);
  const trace = useMemo(() => simulateStack(iterations), [iterations]);
  const extent = useMemo(() => Math.max(...trace.flatMap(p => p.heights.map(h => h + 0.5))), [trace]);
  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, elapsed: number) => {
    clearCanvas(context, width, height);
    const point = trace[sampleIndex(trace, elapsed / 1000)];
    const floor = crisp(height - 48);
    const scale = (height - 100) / extent;
    const size = Math.floor(scale);
    context.strokeStyle = colors.border;
    context.beginPath();
    context.moveTo(16, floor);
    context.lineTo(width - 16, floor);
    context.stroke();
    point.heights.forEach((h, i) => {
      const x = crisp(width / 2 - size / 2 + (i % 2) * 5);
      const y = crisp(floor - (h + 0.5) * scale);
      // Transparent boxes keep any real overlap visible.
      context.strokeStyle = colors.foreground;
      context.strokeRect(x, y, size, size);
      context.fillText(String(i + 1), x + 8, y + 18);
    });
    context.fillText(`${iterations} sweep${iterations === 1 ? '' : 's'} / step`, 16, 22);
    context.fillText(`overlap ${(point.penetration * 1000).toFixed(2)} mm`, 16, height - 16);
  }, [extent, iterations, trace]);

  return (
    <section className="project-widget" aria-label="iterative stack correction">
      <InteractiveCanvas hint="increase solver iterations · compare the overlap between boxes" draw={draw} resetKey={replay} staticElapsed={5000} aria-label="four boxes with measured residual penetration" />
      <div className="project-widget-controls">
        <ControlGroup label="release">
          <button type="button" onClick={() => setReplay(r => r + 1)}>[replay]</button>
        </ControlGroup>
        <ControlGroup label="solver">
          <Slider label="iterations" valueText={`${iterations}`} id="solver-iterations" min="1" max="30" step="1" value={iterations}
            onChange={e => { setIterations(Number(e.target.value)); setReplay(r => r + 1); }} />
        </ControlGroup>
      </div>
      <p className="project-widget-note">vertical motion only, dt = 1/12 s; each sweep shares a contact correction between neighboring boxes</p>
    </section>
  );
}

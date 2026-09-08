'use client';

import { useCallback, useMemo, useState } from 'react';
import { pendulumBytes, simulatePendulum } from '@/lib/physics/pendulum';
import InteractiveCanvas from './InteractiveCanvas';
import { clearCanvas, crisp } from './canvas';
import { drawPendulum, pendulumBounds } from './pendulumDrawing';
import colors from './colors';

export default function DeterminismWidget() {
  const [perturbed, setPerturbed] = useState(false);
  const [replay, setReplay] = useState(0);
  const runs = useMemo(() => {
    const left = simulatePendulum(2.2, 0.4);
    const right = simulatePendulum(2.2 + (perturbed ? 1e-6 : 0), 0.4);
    const changed = simulatePendulum(2.2 + 1e-6, 0.4);
    const a = pendulumBytes(left);
    const b = pendulumBytes(right);
    const c = pendulumBytes(changed);
    return { left, right, changed, identical: a.every((byte, i) => byte === b[i]), previewIdentical: a.every((byte, i) => byte === c[i]), bounds: pendulumBounds([left, right, changed]) };
  }, [perturbed]);
  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
    clearCanvas(context, width, height);
    const time = Math.min(elapsed / 1000, runs.left[runs.left.length - 1].time);
    const panel = width / 2;
    drawPendulum(context, runs.left, time, panel, height, runs.bounds);
    context.fillText('reference', 12, 22);
    context.save();
    context.translate(panel, 0);
    drawPendulum(context, staticPreview ? runs.changed : runs.right, time, panel, height, runs.bounds);
    context.fillText(staticPreview || perturbed ? '+1e-6 rad' : 'same start', 12, 22);
    context.restore();
    context.strokeStyle = colors.border;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(crisp(panel), 12);
    context.lineTo(crisp(panel), height - 44);
    context.stroke();
    const identical = staticPreview ? runs.previewIdentical : runs.identical;
    context.fillText(`run bytes: ${identical ? 'identical' : 'different'}`, 12, height - 36);
    context.fillText(`${staticPreview ? 'static preview · ' : ''}t ${time.toFixed(2)} s`, 12, height - 16);
  }, [perturbed, runs]);

  return (
    <section className="project-widget" aria-label="deterministic replay and sensitive initial conditions">
      <InteractiveCanvas draw={draw} resetKey={replay} staticElapsed={40000} aria-label="two double pendulums; reduced motion previews the perturbed final state" />
      <div className="project-widget-controls">
        <button type="button" onClick={() => setReplay(r => r + 1)}>[replay]</button>
        <button type="button" aria-pressed={perturbed} onClick={() => { setPerturbed(p => !p); setReplay(r => r + 1); }}>{perturbed ? '[same start]' : '[perturb]'}</button>
      </div>
      <p className="project-widget-hint">40 simulated seconds; a 1e-6 rad change grows over time. static preview shows its final state; [step] starts from rest.</p>
    </section>
  );
}

'use client';

import { useCallback, useMemo, useState } from 'react';
import { pendulumBytes, simulatePendulum } from '@/lib/physics/pendulum';
import InteractiveCanvas from './InteractiveCanvas';
import { WidgetControls, ControlGroup } from './WidgetControls';
import { clearCanvas, crisp } from './canvas';
import { drawPendulum, pendulumBounds } from './pendulumDrawing';
import colors from './colors';
import { divergenceBounds, divergenceTrace, drawDivergence } from './divergenceDrawing';
import styles from './NewtWidgets.module.css';

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
    const divergence = divergenceTrace(left, right);
    const previewDivergence = divergenceTrace(left, changed);
    return { divergence, previewDivergence, plotBounds: divergenceBounds(previewDivergence), left, right, changed, identical: a.every((byte, i) => byte === b[i]), previewIdentical: a.every((byte, i) => byte === c[i]), bounds: pendulumBounds([left, right, changed]) };
  }, [perturbed]);
  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
    clearCanvas(context, width, height);
    const time = Math.min(elapsed / 1000, runs.left[runs.left.length - 1].time);
    const panel = width / 2;
    const pendulumHeight = height - 158;
    drawPendulum(context, runs.left, time, panel, pendulumHeight, runs.bounds);
    context.fillText('reference', 12, 22);
    context.save();
    context.translate(panel, 0);
    drawPendulum(context, staticPreview ? runs.changed : runs.right, time, panel, pendulumHeight, runs.bounds);
    context.fillText(staticPreview || perturbed ? '+1e-6 rad' : 'same start', 12, 22);
    context.restore();
    context.strokeStyle = colors.border;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(crisp(panel), 12);
    context.lineTo(crisp(panel), pendulumHeight - 15);
    context.stroke();
    const identical = staticPreview ? runs.previewIdentical : runs.identical;
    context.fillText(`run bytes: ${identical ? 'identical' : 'different'}`, 12, pendulumHeight - 3);
    drawDivergence(context, width, height, time, staticPreview ? runs.previewDivergence : runs.divergence, runs.plotBounds);
  }, [perturbed, runs]);

  return (
    <section className={`project-widget ${styles.chaos}`} aria-label="deterministic replay and sensitive initial conditions">
      <InteractiveCanvas hint="change one starting angle" draw={draw} resetKey={replay} staticElapsed={40000} aria-label="two double pendulums; reduced motion previews the perturbed final state" />
      <WidgetControls
        note="40 simulated seconds. reduced motion previews the perturbed end state; [step] starts from rest.">
        <ControlGroup>
          <button type="button" aria-pressed={perturbed} onClick={() => { setPerturbed(p => !p); setReplay(r => r + 1); }}>[perturb by 1e-6 rad]</button>
        </ControlGroup>
      </WidgetControls>
    </section>
  );
}

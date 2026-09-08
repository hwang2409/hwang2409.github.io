'use client';

import { useCallback, useId, useState } from 'react';
import { INVERSE_DT, simulateInverse } from '@/lib/physics/inverseDynamics';
import { pendulumPositions } from '@/lib/physics/pendulum';
import InteractiveCanvas from './InteractiveCanvas';
import { WidgetControls, Slider } from './WidgetControls';
import { clearCanvas } from './canvas';
import colors from './colors';
import { demoPlayback } from './demoPlayback';
import styles from './BuildDemos.module.css';

function session(amplitude: number) {
  const trace = simulateInverse(amplitude);
  return { amplitude, trace, sample: demoPlayback(trace, INVERSE_DT),
    maxError: Math.max(...trace.map(p => p.error)),
    bound: Math.max(1, ...trace.flatMap(p => [Math.abs(p.applied.shoulder), Math.abs(p.applied.elbow), Math.abs(p.recovered.shoulder), Math.abs(p.recovered.elbow)])) };
}

export default function InverseDynamicsWidget() {
  const id = useId();
  const [run, setRun] = useState(() => session(4));
  const [reset, setReset] = useState(0);
  const restart = (amplitude: number) => { setRun(session(amplitude)); setReset(n => n + 1); };
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
    const point = run.sample(elapsed, staticPreview);
    clearCanvas(ctx, width, height);
    const pose = pendulumPositions(point);
    const scale = Math.min((width - 32) / 4, 28);
    const ox = width / 2, oy = 102;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + pose.x1 * scale, oy + pose.y1 * scale);
    ctx.lineTo(ox + pose.x2 * scale, oy + pose.y2 * scale); ctx.stroke();
    ctx.fillText(`max error ${run.maxError.toExponential(1)} N·m`, 12, 22);
    ctx.fillText('solid: applied · dots: inverse', 12, 42);
    const end = run.trace[run.trace.length - 1].time;
    const plotX = (time: number) => 40 + time / end * (width - 56);
    const joints = ['shoulder', 'elbow'] as const;
    for (let row = 0; row < joints.length; row += 1) {
      const joint = joints[row], center = 217 + row * 72;
      const plotY = (torque: number) => center - torque / run.bound * 21;
      ctx.fillText(joint, 12, center - 29);
      ctx.fillText('0', 12, center + 4);
      ctx.strokeStyle = colors.border; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(40, center); ctx.lineTo(width - 16, center); ctx.stroke();
      ctx.strokeStyle = colors.foreground;
      ctx.beginPath();
      for (let i = 0; i < run.trace.length; i += 4) {
        const p = run.trace[i];
        if (i === 0) ctx.moveTo(plotX(p.time), plotY(p.applied[joint]));
        else ctx.lineTo(plotX(p.time), plotY(p.applied[joint]));
      }
      ctx.stroke();
      // Sparse open markers let both overlapping series remain legible.
      for (let i = 0; i < run.trace.length; i += 72) {
        const p = run.trace[i];
        ctx.fillStyle = colors.background;
        ctx.beginPath(); ctx.arc(plotX(p.time), plotY(p.recovered[joint]), 2.5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      }
      ctx.strokeStyle = colors.muted;
      ctx.beginPath(); ctx.moveTo(plotX(point.time), center - 24); ctx.lineTo(plotX(point.time), center + 24); ctx.stroke();
    }
    ctx.fillStyle = colors.foreground;
    ctx.fillText(`0–${end} s · ±${run.bound.toFixed(1)} N·m`, 40, height - 8);
  }, [run]);
  return (
    <section className={`project-widget ${styles.demo}`} aria-label="inverse dynamics round trip">
      <InteractiveCanvas hint="adjust torque amplitude · compare applied and recovered torque" draw={draw} resetKey={reset} aria-label="two-link arm above applied and recovered shoulder and elbow torque plots; a cursor follows the motion" />
      <WidgetControls label="torque" actions={
          <button type="button" onClick={() => restart(run.amplitude)}>[replay]</button>
        }
        note="two unit point masses and rods. shoulder = A sin(2t), elbow = A/2 cos(3t). inverse dynamics uses recorded instantaneous accelerations, not finite differences. this f64 browser residual is not newt’s f32 tolerance.">
        <Slider label="torque amplitude" valueText={`${run.amplitude.toFixed(1)} N·m`} id={id} min="0" max="8" step="0.5" value={run.amplitude} onChange={e => restart(Number(e.target.value))} />
      </WidgetControls>
    </section>
  );
}

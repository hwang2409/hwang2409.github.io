'use client';

import { useCallback, useState } from 'react';
import { simulateWarmStart, WARM_DT } from '@/lib/physics/warmStart';
import InteractiveCanvas from './InteractiveCanvas';
import { ControlGroup } from './WidgetControls';
import { clearCanvas } from './canvas';
import colors from './colors';
import { demoPlayback } from './demoPlayback';
import styles from './BuildDemos.module.css';

function session(perturb = false) {
  const cold = simulateWarmStart(false, perturb), warm = simulateWarmStart(true, perturb);
  const trace = cold.map((point, i) => ({ time: point.time, cold: point, warm: warm[i] }));
  return { perturb, sample: demoPlayback(trace, WARM_DT),
    extent: Math.max(...cold.flatMap(p => p.heights), ...warm.flatMap(p => p.heights)) + 0.5,
    event: { cold: cold[120].iterations, warm: warm[120].iterations } };
}

export default function WarmStartWidget() {
  const [run, setRun] = useState(session);
  const [reset, setReset] = useState(0);
  const restart = (perturb: boolean) => { setRun(session(perturb)); setReset(n => n + 1); };
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
    const point = run.sample(elapsed, staticPreview);
    clearCanvas(ctx, width, height);
    const scale = Math.min((height - 145) / run.extent, (width / 2 - 32));
    const floor = height - 60;
    const sides = [point.cold, point.warm];
    for (let side = 0; side < 2; side += 1) {
      const left = side * width / 2 + 12, center = (side + 0.5) * width / 2;
      const data = sides[side];
      ctx.fillText(side === 0 ? 'cold' : 'warm', left, 22);
      ctx.fillText(`${data.iterations} sweeps`, left, 42);
      ctx.fillText(`r ${data.residual.toExponential(1)}`, left, 62);
      ctx.strokeStyle = colors.border;
      ctx.beginPath(); ctx.moveTo(left, floor); ctx.lineTo((side + 1) * width / 2 - 12, floor); ctx.stroke();
      ctx.strokeStyle = colors.foreground;
      for (let i = 0; i < data.heights.length; i += 1) {
        ctx.strokeRect(center - scale / 2, floor - (data.heights[i] + 0.5) * scale, scale, scale);
      }
    }
    ctx.fillText(`t ${point.time.toFixed(2)} s`, 12, height - 32);
    ctx.fillText(run.perturb && point.time >= 1 ? `kick: ${run.event.cold} / ${run.event.warm} sweeps` : 'same tolerance: 1e-7 m/s', 12, height - 12);
  }, [run]);
  return (
    <section className={`project-widget ${styles.demo}`} aria-label="cold versus warm-started stack solver">
      <InteractiveCanvas hint="perturb the top box · compare cold and warm solver counts" draw={draw} resetKey={reset} aria-label="two four-box stacks with live iteration counts and contact velocity residuals" />
      <div className="project-widget-controls">
        <ControlGroup label="stack">
          <button type="button" onClick={() => restart(true)}>[perturb]</button>
          <button type="button" onClick={() => restart(false)}>[reset]</button>
        </ControlGroup>
      </div>
      <p className="project-widget-note">[perturb] replays with a downward 0.015 m/s kick to the top box at t = 1 s. warm reuses prior impulses; cold starts at zero. both stop at the same residual. the kick’s counts remain below.</p>
    </section>
  );
}

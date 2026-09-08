'use client';

import { useCallback, useId, useState } from 'react';
import { BALL_RADIUS, CONTACT_DT, contactStiffness, simulateSoftContact } from '@/lib/physics/softContact';
import InteractiveCanvas from './InteractiveCanvas';
import { WidgetControls, Slider } from './WidgetControls';
import { clearCanvas } from './canvas';
import colors from './colors';
import { demoPlayback } from './demoPlayback';
import styles from './BuildDemos.module.css';

function session(softness: number) {
  const trace = simulateSoftContact(softness);
  return { softness, sample: demoPlayback(trace, CONTACT_DT),
    low: Math.min(0, ...trace.map(p => p.height - BALL_RADIUS)),
    high: Math.max(...trace.map(p => p.height + BALL_RADIUS)) };
}

export default function ContactSoftnessWidget() {
  const id = useId();
  const [run, setRun] = useState(() => session(0.75));
  const [reset, setReset] = useState(0);
  const restart = (softness: number) => { setRun(session(softness)); setReset(n => n + 1); };
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
    const point = run.sample(elapsed, staticPreview);
    clearCanvas(ctx, width, height);
    const scale = (height - 100) / (run.high - run.low);
    const y = (value: number) => 50 + (run.high - value) * scale;
    const ground = y(0), x = width / 2;
    ctx.fillStyle = colors.code;
    ctx.fillRect(12, ground, width - 24, height - 45 - ground);
    ctx.strokeStyle = colors.border;
    ctx.beginPath(); ctx.moveTo(12, ground); ctx.lineTo(width - 12, ground); ctx.stroke();
    ctx.strokeStyle = colors.foreground;
    ctx.beginPath(); ctx.arc(x, y(point.height), BALL_RADIUS * scale, 0, Math.PI * 2); ctx.stroke();
    if (point.penetration > 0) {
      ctx.beginPath(); ctx.moveTo(x, ground); ctx.lineTo(x, y(point.height - BALL_RADIUS)); ctx.stroke();
    }
    ctx.fillStyle = colors.foreground;
    ctx.fillText(`penetration ${(point.penetration * 1000).toFixed(1)} mm`, 12, 22);
    ctx.fillText(`t ${point.time.toFixed(2)} s`, 12, height - 16);
  }, [run]);
  return (
    <section className={`project-widget ${styles.demo}`} aria-label="contact softness">
      <InteractiveCanvas hint="adjust softness · drop again to compare penetration" draw={draw} resetKey={reset} aria-label="a dropped ball compresses a spring contact; penetration depth appears above" />
      <WidgetControls label="contact" actions={
          <button type="button" onClick={() => restart(run.softness)}>[drop again]</button>
        }
        note="0 = hard, 1 = soft. unit mass, spring–damper contact, fixed damping ratio 0.18. stiffness is an analogy for compliance, not newt’s solimp mapping.">
        <Slider label="softness" valueText={`${run.softness.toFixed(2)} · ${contactStiffness(run.softness).toFixed(0)} N/m`} id={id} min="0" max="1" step="0.01" value={run.softness} onChange={e => restart(Number(e.target.value))} />
      </WidgetControls>
    </section>
  );
}

'use client';

import { useCallback, useId, useState } from 'react';
import { ANCHOR, LINK_LENGTH, LINK_PIVOT, PEG_RADIUS, tendonWrap } from '@/lib/physics/tendonWrap';
import InteractiveCanvas from './InteractiveCanvas';
import { WidgetControls, Slider } from './WidgetControls';
import { clearCanvas } from './canvas';
import colors from './colors';
import styles from './BuildDemos.module.css';

export default function TendonWrapWidget() {
  const id = useId();
  const [angle, setAngle] = useState(45);
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    clearCanvas(ctx, width, height);
    const path = tendonWrap(angle * Math.PI / 180);
    // Include the entire link sweep, the anchor and the peg in world bounds.
    const left = Math.min(ANCHOR.x, LINK_PIVOT.x - LINK_LENGTH, -PEG_RADIUS) - 0.2;
    const right = Math.max(ANCHOR.x, LINK_PIVOT.x + LINK_LENGTH, PEG_RADIUS) + 0.2;
    const bottom = Math.min(-PEG_RADIUS, LINK_PIVOT.y - LINK_LENGTH) - 0.2;
    const top = Math.max(PEG_RADIUS, LINK_PIVOT.y + LINK_LENGTH) + 0.2;
    const scale = Math.min((width - 32) / (right - left), (height - 100) / (top - bottom));
    const x = (v: number) => width / 2 + (v - (left + right) / 2) * scale;
    const y = (v: number) => height / 2 + 8 - (v - (bottom + top) / 2) * scale;
    ctx.strokeStyle = colors.border;
    ctx.beginPath(); ctx.arc(x(0), y(0), PEG_RADIUS * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x(LINK_PIVOT.x), y(LINK_PIVOT.y)); ctx.lineTo(x(path.end.x), y(path.end.y)); ctx.stroke();
    ctx.strokeStyle = colors.foreground; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x(ANCHOR.x), y(ANCHOR.y));
    if (path.wrapped) {
      ctx.lineTo(x(PEG_RADIUS * Math.cos(path.startAngle)), y(PEG_RADIUS * Math.sin(path.startAngle)));
      ctx.arc(x(0), y(0), PEG_RADIUS * scale, -path.startAngle, -path.endAngle, path.endAngle > path.startAngle);
    }
    ctx.lineTo(x(path.end.x), y(path.end.y)); ctx.stroke();
    for (const p of [ANCHOR, LINK_PIVOT, path.end]) {
      ctx.beginPath(); ctx.arc(x(p.x), y(p.y), 3, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.fillText(`length ${path.length.toFixed(4)} m`, 12, 22);
    ctx.fillText(path.wrapped ? 'tangent + arc + tangent' : 'straight path', 12, height - 16);
  }, [angle]);
  return (
    <section className={`project-widget ${styles.demo}`} aria-label="tendon wrap geometry">
      <InteractiveCanvas hint="rotate the link · watch the tendon wrap around the peg" draw={draw} resetKey={angle} aria-label="a tendon from a fixed anchor wraps around a circular peg to a rotating link" />
      <WidgetControls label="link" actions={
          <button type="button" onClick={() => setAngle(45)}>[reset]</button>
        }
        note="a planar section of cylinder wrapping. two tangent segments meet a circular arc; the arc vanishes when the straight path clears the peg.">
        <Slider label="link angle" valueText={`${angle}°`} id={id} min="25" max="110" step="1" value={angle} onChange={e => setAngle(Number(e.target.value))} />
      </WidgetControls>
    </section>
  );
}

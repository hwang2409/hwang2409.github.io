'use client';

import { useCallback, useState } from 'react';
import { inclineForces } from '@/lib/physics/friction';
import InteractiveCanvas from './InteractiveCanvas';
import { WidgetControls, ControlGroup, Slider } from './WidgetControls';
import { clearCanvas } from './canvas';
import colors from './colors';

export default function FrictionConeWidget() {
  const [angle, setAngle] = useState(25);
  const [friction, setFriction] = useState(0.5);
  const [replay, setReplay] = useState(0);
  const forces = inclineForces(angle, friction);
  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, elapsed: number) => {
    clearCanvas(context, width, height);
    const f = inclineForces(angle, friction);
    const time = Math.min(elapsed / 1000, 3);
    const distance = 0.5 * f.acceleration * time * time;
    // Fit the complete three-second trajectory, including the block, to the panel.
    const travel = Math.max(2, 0.5 * f.acceleration * 9 + 1);
    const scale = Math.min((width - 64) / (travel * Math.cos(f.angle)), (height - 140) / (travel * Math.sin(f.angle) + 0.6));
    context.save();
    context.translate(28, 90);
    context.rotate(f.angle);
    context.strokeStyle = colors.border;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(travel * scale, 0);
    context.stroke();
    context.fillStyle = colors.foreground;
    context.fillRect((distance + 0.15) * scale, -14, 20, 14);
    // Force-space cone at the current block, normalized for readability.
    const origin = (distance + 0.15) * scale + 10;
    context.strokeStyle = colors.muted;
    context.beginPath();
    context.moveTo(origin - friction * 35, -49);
    context.lineTo(origin, -14);
    context.lineTo(origin + friction * 35, -49);
    context.stroke();
    context.strokeStyle = colors.foreground;
    context.beginPath();
    context.moveTo(origin, -14);
    context.lineTo(origin - f.ratio * 35, -49);
    context.stroke();
    context.restore();
    context.fillText(f.acceleration === 0 ? 'sticks · inside cone' : 'slides · outside cone', 16, 22);
    context.fillText(`force ratio ${f.ratio.toFixed(3)} / μ ${friction.toFixed(2)}`, 16, 42);
    context.fillText(`t ${time.toFixed(2)} s · travel ${distance.toFixed(2)} m`, 16, height - 16);
  }, [angle, friction]);

  return (
    <section className="project-widget" aria-label="friction threshold on an incline">
      <InteractiveCanvas hint="adjust the incline or friction · watch the block stick or slide" draw={draw} resetKey={replay} staticElapsed={3000} aria-label="block on a slope with the required support force and friction cone" />
      <WidgetControls readout={{ children: <>{forces.acceleration === 0 ? 'sticks' : 'slides'}: required ratio {forces.ratio.toFixed(3)}, available μ {friction.toFixed(2)}. the dark line is required support; the two light lines bound the cone.</> }}>
        <ControlGroup label="release">
          <button type="button" onClick={() => setReplay(r => r + 1)}>[replay]</button>
        </ControlGroup>
        <ControlGroup label="incline">
          <Slider label="incline" valueText={`${angle}°`} id="incline-angle" min="0" max="50" value={angle}
            onChange={e => { setAngle(Number(e.target.value)); setReplay(r => r + 1); }} />
          <Slider label="friction μ" valueText={`${friction.toFixed(2)}`} id="incline-friction" min="0" max="1.2" step="0.01" value={friction}
            onChange={e => { setFriction(Number(e.target.value)); setReplay(r => r + 1); }} />
        </ControlGroup>
      </WidgetControls>
    </section>
  );
}

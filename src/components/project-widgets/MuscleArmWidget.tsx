'use client';

import { useCallback, useId, useState } from 'react';
import { armReadout, createArm, muscleGeometry, muscleLength, stepArm } from '@/lib/physics/muscle';
import { pendulumPositions } from '@/lib/physics/pendulum';
import { createClock } from '@/lib/physics/scene';
import InteractiveCanvas from './InteractiveCanvas';
import { ControlGroup, Slider } from './WidgetControls';
import { clearCanvas } from './canvas';
import colors from './colors';
import styles from './NewtWidgets.module.css';

function session(control = 0.45) {
  const arm = createArm(); arm.control = control;
  return { arm, clock: createClock(1 / 240) };
}

export default function MuscleArmWidget() {
  const id = useId();
  const [runtime, setRuntime] = useState(session);
  const [revision, setRevision] = useState(0);
  const [reset, setReset] = useState(0);
  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
    if (!staticPreview) runtime.clock(elapsed, () => stepArm(runtime.arm, 1 / 240));
    clearCanvas(context, width, height);
    const { arm } = runtime;
    const readout = armReadout(arm);
    const p = pendulumPositions(arm.state);
    // Reach is exactly two unit rods, including all possible poses.
    const scale = Math.min((width - 32) / 4.4, (height - 150) / 4.4);
    const ox = width / 2, oy = (height - 100) / 2 + 14;
    const x1 = ox + p.x1 * scale, y1 = oy + p.y1 * scale;
    const x2 = ox + p.x2 * scale, y2 = oy + p.y2 * scale;
    const ax = ox + 0.4 * p.x1 * scale, ay = oy + 0.4 * p.y1 * scale;
    const bx = x1 + 0.35 * (p.x2 - p.x1) * scale, by = y1 + 0.35 * (p.y2 - p.y1) * scale;
    context.lineWidth = 3; context.beginPath();
    context.moveTo(ox, oy); context.lineTo(x1, y1); context.lineTo(x2, y2); context.stroke();
    context.strokeStyle = colors.muted;
    context.lineWidth = 2 + arm.activation * 7;
    context.beginPath(); context.moveTo(ax, ay); context.lineTo(bx, by); context.stroke();
    context.fillStyle = colors.background;
    for (const [x, y] of [[ox, oy], [x1, y1], [x2, y2]]) {
      context.lineWidth = 1; context.strokeStyle = colors.foreground;
      context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.fill(); context.stroke();
    }
    context.fillStyle = colors.foreground;
    context.fillText(`activation ${arm.activation.toFixed(2)} / ${arm.control.toFixed(2)}`, 12, 20);
    context.fillText(`elbow torque ${readout.torque.toFixed(2)} N·m`, 12, 39);
    const left = 28, right = width - 16, floor = height - 27, plotHeight = 48;
    const minLength = muscleGeometry(Math.PI, 0).length / 0.8;
    const plotX = (length: number) => left + (length - minLength) / (1.6 - minLength) * (right - left);
    context.strokeStyle = colors.border; context.lineWidth = 1;
    context.beginPath(); context.moveTo(left, floor - plotHeight); context.lineTo(left, floor); context.lineTo(right, floor); context.stroke();
    context.strokeStyle = colors.foreground; context.beginPath();
    for (let i = 0; i <= 100; i += 1) {
      const length = minLength + (1.6 - minLength) * i / 100;
      const x = plotX(length), y = floor - muscleLength(length) * plotHeight;
      if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke();
    const normalizedLength = readout.length / 0.8;
    context.beginPath(); context.arc(plotX(normalizedLength), floor - muscleLength(normalizedLength) * plotHeight, 3, 0, 2 * Math.PI); context.fill();
    context.fillText('active force–length', left, floor - plotHeight - 10);
    context.fillText(`L ${normalizedLength.toFixed(2)} · F ${readout.force.toFixed(1)} N`, left, height - 8);
  }, [runtime]);
  return (
    <section className={`project-widget ${styles.scene}`} aria-label="two-link arm with muscle actuator">
      <InteractiveCanvas hint="raise activation to pull the forearm · reset to compare from rest" draw={draw} resetKey={reset} redrawKey={revision} aria-label="gravity-loaded two-link arm; a muscle pulls between upper arm and forearm, with its force-length curve below" />
      <div className="project-widget-controls">
        <ControlGroup label="arm">
          <button type="button" onClick={() => { setRuntime(session(runtime.arm.control)); setReset(n => n + 1); }}>[reset]</button>
        </ControlGroup>
        <ControlGroup label="muscle">
          <Slider label="activation target" valueText={`${runtime.arm.control.toFixed(2)}`} id={`${id}-activation`} min="0" max="1" step="0.01" value={runtime.arm.control}
            onChange={e => { runtime.arm.control = Number(e.target.value); setRevision(n => n + 1); }} />
        </ControlGroup>
      </div>
      <p className="project-widget-note">two unit point masses, coupled RK4 dynamics, joint damping. active force = 100 N × activation × length curve × velocity curve. a straight tendon converts force to elbow torque; passive muscle force is omitted.</p>
    </section>
  );
}

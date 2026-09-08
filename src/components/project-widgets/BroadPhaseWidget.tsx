'use client';

import { useCallback, useState } from 'react';
import { createBroadPhase, findPairs, stepBroadPhase } from '@/lib/physics/broadphase';
import { createClock } from '@/lib/physics/scene';
import InteractiveCanvas from './InteractiveCanvas';
import { clearCanvas } from './canvas';
import { sceneLayout } from './sceneDrawing';
import colors from './colors';
import styles from './NewtWidgets.module.css';

function session() {
  return { scene: createBroadPhase(), clock: createClock(1 / 120), sweep: true };
}

export default function BroadPhaseWidget() {
  const [runtime, setRuntime] = useState(session);
  const [revision, setRevision] = useState(0);
  const [reset, setReset] = useState(0);
  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
    const { scene } = runtime;
    if (!staticPreview) runtime.clock(elapsed, () => stepBroadPhase(scene, 1 / 120));
    findPairs(scene, runtime.sweep);
    clearCanvas(context, width, height);
    const { scale, left, floor } = sceneLayout(width, height, scene);
    context.strokeStyle = colors.border;
    context.globalAlpha = runtime.sweep ? 0.8 : 0.18;
    context.beginPath();
    for (let i = 0; i < scene.count; i += 1) {
      const a = scene.bodies[scene.pairs[i * 2]], b = scene.bodies[scene.pairs[i * 2 + 1]];
      context.moveTo(left + a.x * scale, floor - a.y * scale);
      context.lineTo(left + b.x * scale, floor - b.y * scale);
    }
    context.stroke(); context.globalAlpha = 1;
    for (const b of scene.bodies) {
      const x = left + b.x * scale, y = floor - b.y * scale, r = b.radius * scale;
      context.strokeStyle = colors.border; context.strokeRect(x - r, y - r, 2 * r, 2 * r);
      context.strokeStyle = colors.foreground;
      context.beginPath(); context.arc(x, y, r, 0, 2 * Math.PI); context.stroke();
    }
    const allPairs = scene.bodies.length * (scene.bodies.length - 1) / 2;
    context.fillText(`${runtime.sweep ? 'sweep' : 'all pairs'}: ${scene.count} / ${allPairs} pairs`, 12, 20);
    context.fillText(`${scene.comparisons} pair checks this frame`, 12, height - 12);
  }, [runtime]);
  return (
    <section className={`project-widget ${styles.scene}`} aria-label="broad-phase candidate pairs">
      <InteractiveCanvas draw={draw} resetKey={reset} redrawKey={revision} aria-label="forty drifting circles with bounding boxes and candidate-pair lines" />
      <div className={`project-widget-controls ${styles.controls}`}>
        <button type="button" aria-pressed={!runtime.sweep} onClick={() => { runtime.sweep = false; setRevision(n => n + 1); }}>[all pairs]</button>
        <button type="button" aria-pressed={runtime.sweep} onClick={() => { runtime.sweep = true; setRevision(n => n + 1); }}>[sweep]</button>
        <button type="button" onClick={() => { setRuntime(session()); setReset(n => n + 1); }}>[reset]</button>
      </div>
      <p className="project-widget-hint">same seeded motion in both modes. all pairs sends every pair onward; sweep sorts x bounds, then checks y overlap. lines mark candidates, not confirmed contacts. bodies pass through each other.</p>
    </section>
  );
}

'use client';

import { useCallback, useId, useState, type PointerEvent } from 'react';
import { BODY_LIMIT, createClock, createScene, fireProjectile, SCENE_DT, spawnBody, stepScene } from '@/lib/physics/scene';
import InteractiveCanvas from './InteractiveCanvas';
import { containsBody, drawScene, sceneLayout } from './sceneDrawing';
import styles from './NewtWidgets.module.css';

function session(wall: boolean) {
  const scene = createScene(wall);
  const clock = createClock(SCENE_DT);
  const drag = { index: -1, x: 0, y: 0, pointer: -1 };
  return { scene, clock, drag, selected: 0 };
}

export default function PlaygroundWidget({ wall = false }: { wall?: boolean }) {
  const id = useId();
  const [runtime, setRuntime] = useState(() => session(wall));
  const [reset, setReset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [angle, setAngle] = useState(wall ? 12 : 60);
  const [speed, setSpeed] = useState(wall ? 14 : 8);
  const [message, setMessage] = useState('');
  const refresh = () => setRevision(n => n + 1);
  const { scene, drag } = runtime;
  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
    if (!staticPreview) runtime.clock(elapsed, () => {
      const b = runtime.scene.bodies[runtime.drag.index];
      if (b) {
        // A damped spring pulls the selected center; releasing preserves its velocity.
        const ax = 95 * (runtime.drag.x - b.x) - 9 * b.vx;
        const ay = 95 * (runtime.drag.y - b.y) - 9 * b.vy;
        const limit = Math.min(1, 160 / Math.max(1, Math.hypot(ax, ay)));
        b.vx += ax * limit * SCENE_DT; b.vy += ay * limit * SCENE_DT;
      }
      stepScene(runtime.scene);
    });
    drawScene(context, width, height, runtime.scene, wall ? -1 : runtime.selected);
    if (!wall && runtime.drag.index >= 0) {
      const layout = sceneLayout(width, height, runtime.scene);
      const b = runtime.scene.bodies[runtime.drag.index];
      context.setLineDash([4, 4]); context.beginPath();
      context.moveTo(layout.left + b.x * layout.scale, layout.floor - b.y * layout.scale);
      context.lineTo(layout.left + runtime.drag.x * layout.scale, layout.floor - runtime.drag.y * layout.scale);
      context.stroke(); context.setLineDash([]);
    }
  }, [runtime, wall]);

  const coordinates = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const layout = sceneLayout(rect.width, rect.height, scene);
    return { x: Math.max(0, Math.min(scene.width, (event.clientX - rect.left - layout.left) / layout.scale)),
      y: Math.max(0, Math.min(scene.height, (layout.floor - event.clientY + rect.top) / layout.scale)) };
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || drag.pointer !== -1) return;
    const p = coordinates(event);
    for (let i = scene.bodies.length - 1; i >= 0; i -= 1) {
      if (containsBody(scene.bodies[i], p.x, p.y)) {
        drag.index = i; drag.x = p.x; drag.y = p.y; drag.pointer = event.pointerId;
        runtime.selected = i;
        event.currentTarget.setPointerCapture(event.pointerId);
        refresh(); return;
      }
    }
    const added = spawnBody(scene, 'box', p.x, p.y);
    setMessage(added ? 'box added' : 'no room here; try another position or reset');
    if (added) runtime.selected = scene.bodies.length - 1;
    refresh();
  };
  const release = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drag.pointer !== event.pointerId) return;
    drag.index = -1; drag.pointer = -1;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    refresh();
  };
  const spawn = (kind: 'box' | 'ball') => {
    const added = spawnBody(scene, kind);
    if (added) runtime.selected = scene.bodies.length - 1;
    setMessage(added ? `${kind} added` : 'spawn area occupied; let it clear or reset');
    refresh();
  };
  const launch = () => {
    if (wall) {
      setMessage(fireProjectile(scene, angle * Math.PI / 180, speed) ? 'projectile fired' : 'launch area occupied or body limit reached');
    } else {
      const b = scene.bodies[runtime.selected];
      b.vx = speed * Math.cos(angle * Math.PI / 180); b.vy = speed * Math.sin(angle * Math.PI / 180);
      setMessage(`body ${runtime.selected + 1} launched`);
    }
    refresh();
  };
  return (
    <section className={`project-widget ${styles.scene}`} aria-label={wall ? 'projectile versus stacked wall' : 'physics playground'}>
      <InteractiveCanvas draw={draw} resetKey={reset} redrawKey={revision}
        className={wall ? undefined : 'project-widget-draggable'}
        aria-label={wall ? 'a heavy ball hits fifteen rotating boxes' : 'boxes and balls with gravity; drag a body to pull and release it'}
        onPointerDown={wall ? undefined : down} onPointerUp={wall ? undefined : release}
        onPointerCancel={wall ? undefined : release} onLostPointerCapture={wall ? undefined : release}
        onPointerMove={wall ? undefined : event => {
          if (drag.pointer !== event.pointerId) return;
          const p = coordinates(event); drag.x = p.x; drag.y = p.y; refresh();
        }} />
      <div className={`project-widget-controls ${styles.controls}`}>
        {wall ? null : <>
          <button type="button" disabled={scene.bodies.length >= BODY_LIMIT} onClick={() => spawn('box')}>[spawn box]</button>
          <button type="button" disabled={scene.bodies.length >= BODY_LIMIT} onClick={() => spawn('ball')}>[spawn ball]</button>
          <label htmlFor={`${id}-gravity`}>gravity: {scene.gravity.toFixed(1)} m/s²
            <input id={`${id}-gravity`} type="range" min="0" max="20" step="0.1" value={scene.gravity}
              onChange={e => { scene.gravity = Number(e.target.value); refresh(); }} />
          </label>
          <label htmlFor={`${id}-body`}>body to fling
            <select id={`${id}-body`} value={runtime.selected} onChange={e => { runtime.selected = Number(e.target.value); refresh(); }}>
              {scene.bodies.map((b, i) => <option key={i} value={i}>{i + 1}: {b.kind}</option>)}
            </select>
          </label>
        </>}
        <label htmlFor={`${id}-angle`}>angle: {angle}°
          <input id={`${id}-angle`} type="range" min={wall ? 0 : -180} max={wall ? 45 : 180} value={angle} onChange={e => setAngle(Number(e.target.value))} />
        </label>
        <label htmlFor={`${id}-speed`}>speed: {speed} m/s
          <input id={`${id}-speed`} type="range" min="2" max="20" value={speed} onChange={e => setSpeed(Number(e.target.value))} />
        </label>
        <button type="button" disabled={wall && scene.bodies.length >= BODY_LIMIT} onClick={launch}>{wall ? '[fire]' : '[fling body]'}</button>
        <button type="button" onClick={() => { setRuntime(session(wall)); setReset(n => n + 1); setMessage('scene reset'); }}>[reset]</button>
      </div>
      <p className={`project-widget-hint ${styles.status}`} role="status">{message || (wall ? '8 kg projectile · 1 kg boxes · choose a shot, then fire' : 'click empty space to add a box; drag any body, then release')}</p>
      <p className="project-widget-hint">2d rigid bodies · dt = 1/180 s · friction 0.55 · restitution 0.3. energy includes gravity and rotation; spawning and flinging add energy. reduced motion: [step] advances 0.35 s.</p>
    </section>
  );
}

export function ProjectileStackWidget() {
  return <PlaygroundWidget wall />;
}

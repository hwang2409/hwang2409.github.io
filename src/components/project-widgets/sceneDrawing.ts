import type { Body } from '@/lib/physics/contacts';
import { BODY_LIMIT, sceneEnergy, type Scene } from '@/lib/physics/scene';
import { clearCanvas } from './canvas';
import colors from './colors';

export function sceneLayout(width: number, height: number, scene: { width: number; height: number }) {
  const scale = Math.min((width - 24) / scene.width, (height - 82) / scene.height);
  return { scale, left: (width - scene.width * scale) / 2, floor: height - 36 };
}

export function drawScene(context: CanvasRenderingContext2D, width: number, height: number, scene: Scene, selected: number) {
  clearCanvas(context, width, height);
  const { scale, left, floor } = sceneLayout(width, height, scene);
  context.strokeStyle = colors.border;
  context.strokeRect(left, floor - scene.height * scale, scene.width * scale, scene.height * scale);
  for (let i = 0; i < scene.bodies.length; i += 1) {
    const b = scene.bodies[i];
    context.save();
    context.translate(left + b.x * scale, floor - b.y * scale);
    context.rotate(-b.angle);
    context.lineWidth = i === selected ? 2 : 1;
    context.fillStyle = colors.code;
    context.strokeStyle = colors.foreground;
    context.beginPath();
    if (b.kind === 'ball') context.arc(0, 0, b.radius * scale, 0, 2 * Math.PI);
    else context.rect(-b.radius * scale, -b.radius * scale, 2 * b.radius * scale, 2 * b.radius * scale);
    context.fill(); context.stroke();
    if (b.kind === 'ball') {
      context.beginPath(); context.moveTo(0, 0); context.lineTo(b.radius * scale, 0); context.stroke();
    }
    context.restore();
  }
  context.fillText(`${scene.bodies.length}/${BODY_LIMIT} bodies · ${scene.iterations} sweeps`, 12, 20);
  context.fillText(`energy ${sceneEnergy(scene).toFixed(1)} J`, 12, height - 12);
  if (width > 400) context.fillText(`t ${scene.time.toFixed(1)} s`, width - 100, height - 12);
}

export function containsBody(b: Body, x: number, y: number) {
  const c = Math.cos(b.angle), s = Math.sin(b.angle);
  const lx = c * (x - b.x) + s * (y - b.y), ly = -s * (x - b.x) + c * (y - b.y);
  return b.kind === 'ball' ? Math.hypot(lx, ly) <= b.radius : Math.max(Math.abs(lx), Math.abs(ly)) <= b.radius;
}

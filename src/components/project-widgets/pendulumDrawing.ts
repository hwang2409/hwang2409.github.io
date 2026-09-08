import { pendulumPositions, type PendulumPoint } from '@/lib/physics/pendulum';
import { sampleIndex } from '@/lib/physics/sampling';
import colors from './colors';

export function pendulumBounds(traces: PendulumPoint[][]) {
  let x = 0;
  let y = 0;
  for (const trace of traces) {
    for (const point of trace) {
      const p = pendulumPositions(point);
      x = Math.max(x, Math.abs(p.x1), Math.abs(p.x2));
      y = Math.max(y, Math.abs(p.y1), Math.abs(p.y2));
    }
  }
  return { x: x + 0.2, y: y + 0.2 };
}

type PendulumBounds = ReturnType<typeof pendulumBounds>;

export function pendulumLayout(width: number, height: number, bounds: PendulumBounds) {
  return { x: width / 2, y: height / 2, scale: Math.min((width - 32) / (2 * bounds.x), (height - 80) / (2 * bounds.y)) };
}

export function drawPendulum(context: CanvasRenderingContext2D, trace: PendulumPoint[], time: number, width: number, height: number, bounds: PendulumBounds) {
  const layout = pendulumLayout(width, height, bounds);
  const index = sampleIndex(trace, time);
  const p = pendulumPositions(trace[index]);
  context.strokeStyle = colors.border;
  context.lineWidth = 1;
  context.beginPath();
  const start = sampleIndex(trace, time - 3);
  for (let i = start; i <= index; i += 3) {
    const tip = pendulumPositions(trace[i]);
    const x = layout.x + tip.x2 * layout.scale;
    const y = layout.y + tip.y2 * layout.scale;
    if (i === start) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
  const x1 = layout.x + p.x1 * layout.scale;
  const y1 = layout.y + p.y1 * layout.scale;
  const x2 = layout.x + p.x2 * layout.scale;
  const y2 = layout.y + p.y2 * layout.scale;
  context.strokeStyle = colors.foreground;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(layout.x, layout.y);
  context.lineTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  context.fillStyle = colors.foreground;
  for (const [x, y] of [[layout.x, layout.y], [x1, y1], [x2, y2]]) {
    context.beginPath();
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.fill();
  }
  return { x1, y1, x2, y2, layout };
}

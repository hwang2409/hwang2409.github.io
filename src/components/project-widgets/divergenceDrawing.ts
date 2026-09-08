import { sampleIndex } from '@/lib/physics/sampling';
import type { PendulumPoint } from '@/lib/physics/pendulum';
import colors from './colors';

export function divergenceTrace(left: PendulumPoint[], right: PendulumPoint[]) {
  return left.map((p, i) => ({ time: p.time, value: Math.hypot(p.q1 - right[i].q1, p.q2 - right[i].q2) }));
}

export function divergenceBounds(trace: ReturnType<typeof divergenceTrace>) {
  let low = Infinity, high = -Infinity;
  for (const p of trace) {
    if (p.value > 0) { const log = Math.log10(p.value); low = Math.min(low, log); high = Math.max(high, log); }
  }
  return { low: Math.floor(low), high: Math.max(Math.floor(low) + 1, Math.ceil(high)) };
}

export function drawDivergence(context: CanvasRenderingContext2D, width: number, height: number, time: number,
  trace: ReturnType<typeof divergenceTrace>, bounds: ReturnType<typeof divergenceBounds>) {
  const left = 48, right = width - 12, top = height - 106, floor = height - 31;
  const endTime = Math.min(trace[trace.length - 1].time, Math.max(15, time));
  const startTime = Math.max(0, endTime - 15);
  const x = (t: number) => left + (t - startTime) / (endTime - startTime) * (right - left);
  const y = (v: number) => floor - (Math.max(bounds.low, Math.log10(v)) - bounds.low) / (bounds.high - bounds.low) * (floor - top);
  context.lineWidth = 1;
  for (const exponent of [bounds.low, Math.round((bounds.low + bounds.high) / 2), bounds.high]) {
    const py = y(10 ** exponent);
    context.strokeStyle = colors.border; context.beginPath(); context.moveTo(left, py); context.lineTo(right, py); context.stroke();
    context.fillText(`1e${exponent}`, 4, py + 4);
  }
  const start = sampleIndex(trace, startTime), end = sampleIndex(trace, time);
  const stride = Math.max(1, Math.floor((end - start) / (right - left)));
  context.strokeStyle = colors.foreground; context.beginPath();
  for (let i = start; i <= end; i += stride) {
    if (i === start) context.moveTo(x(trace[i].time), y(trace[i].value));
    else context.lineTo(x(trace[i].time), y(trace[i].value));
  }
  context.lineTo(x(trace[end].time), y(trace[end].value)); context.stroke();
  context.fillText(`|Δq| ${trace[end].value.toExponential(1)} rad`, 12, top - 14);
  context.fillText(`${startTime.toFixed(0)} s`, left, height - 10);
  context.textAlign = 'right'; context.fillText(`${endTime.toFixed(0)} s`, right, height - 10); context.textAlign = 'left';
}

import { createClock } from '@/lib/physics/scene';
import { sampleIndex } from '@/lib/physics/sampling';

// Shared accumulator caps long frames and preserves explicit reduced-motion
// steps. Trace lookup uses timestamps, not assumed display frame counts.
export function demoPlayback<T extends { time: number }>(trace: readonly T[], dt: number) {
  const clock = createClock(dt);
  let time = 0;
  return (elapsed: number, staticPreview: boolean) => {
    if (!staticPreview) clock(elapsed, () => { time = Math.min(trace[trace.length - 1].time, time + dt); });
    return trace[sampleIndex(trace, time)];
  };
}

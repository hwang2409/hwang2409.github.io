// Uniform traces carry their own interval. Clamp both ends before indexing.
export function sampleIndex(trace: readonly { time: number }[], time: number) {
  const dt = trace.length > 1 ? trace[1].time - trace[0].time : 1;
  return Math.max(0, Math.min(trace.length - 1, Math.floor((time - trace[0].time) / dt)));
}

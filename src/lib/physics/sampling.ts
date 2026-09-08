// Find the last sample at or before time, clamped to the trace endpoints.
export function sampleIndex(trace: readonly { time: number }[], time: number) {
  let low = 0;
  let high = trace.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (trace[middle].time <= time) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

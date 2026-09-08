export const WARM_DT = 1 / 120;
export const WARM_TOLERANCE = 1e-7;
export type WarmPoint = { time: number; heights: number[]; iterations: number; residual: number };

// The same four unit boxes as the position-projection demo, now solved in
// velocity space. Contact order, tolerance and loads are identical in both runs.
export function simulateWarmStart(warm: boolean, perturb = false): WarmPoint[] {
  const heights = [0.5, 1.5, 2.5, 3.5], velocity = [0, 0, 0, 0], impulses = [0, 0, 0, 0];
  const trace: WarmPoint[] = [{ time: 0, heights: [...heights], iterations: 0, residual: 0 }];
  function apply(i: number, impulse: number) {
    velocity[i] += impulse;
    if (i > 0) velocity[i - 1] -= impulse;
  }
  for (let frame = 1; frame <= 360; frame += 1) {
    for (let i = 0; i < 4; i += 1) velocity[i] -= 9.81 * WARM_DT;
    if (perturb && frame === 120) velocity[3] -= 0.015;
    for (let i = 0; i < 4; i += 1) {
      if (!warm) impulses[i] = 0;
      apply(i, impulses[i]);
    }
    let iterations = 0, residual = Infinity;
    while (iterations < 200 && residual > WARM_TOLERANCE) {
      for (let i = 0; i < 4; i += 1) {
        const relative = velocity[i] - (i > 0 ? velocity[i - 1] : 0);
        const next = Math.max(0, impulses[i] - relative / (i > 0 ? 2 : 1));
        apply(i, next - impulses[i]);
        impulses[i] = next;
      }
      residual = 0;
      for (let i = 0; i < 4; i += 1) {
        const relative = velocity[i] - (i > 0 ? velocity[i - 1] : 0);
        residual = Math.max(residual, impulses[i] > 0 ? Math.abs(relative) : Math.max(0, -relative));
      }
      iterations += 1;
    }
    for (let i = 0; i < 4; i += 1) heights[i] += velocity[i] * WARM_DT;
    trace.push({ time: frame * WARM_DT, heights: [...heights], iterations, residual });
  }
  return trace;
}

export type StackPoint = { time: number; heights: number[]; penetration: number };

// Four unit masses, unit box height, vertical translation only. Sequential
// position projection shares each correction equally between dynamic bodies.
export function simulateStack(iterations: number, duration = 5, dt = 1 / 12): StackPoint[] {
  const heights = [0.5, 1.5, 2.5, 3.5];
  const velocities = [0, 0, 0, 0];
  const trace: StackPoint[] = [{ time: 0, heights: [...heights], penetration: 0 }];
  for (let step = 1; step <= Math.round(duration / dt); step += 1) {
    const previous = [...heights];
    for (let i = 0; i < heights.length; i += 1) {
      velocities[i] -= 9.81 * dt;
      heights[i] += velocities[i] * dt;
    }
    for (let sweep = 0; sweep < iterations; sweep += 1) {
      heights[0] = Math.max(0.5, heights[0]);
      for (let i = 1; i < heights.length; i += 1) {
        const correction = Math.max(0, 1 - (heights[i] - heights[i - 1])) / 2;
        heights[i] += correction;
        heights[i - 1] -= correction;
      }
    }
    let penetration = Math.max(0, 0.5 - heights[0]);
    for (let i = 0; i < heights.length; i += 1) {
      velocities[i] = (heights[i] - previous[i]) / dt;
      if (i > 0) penetration = Math.max(penetration, 1 - heights[i] + heights[i - 1]);
    }
    trace.push({ time: step * dt, heights: [...heights], penetration });
  }
  return trace;
}

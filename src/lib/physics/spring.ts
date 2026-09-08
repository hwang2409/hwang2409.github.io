export type SpringPoint = {
  time: number;
  displacement: number;
};

export function dampingForSlider(value: number) {
  return 0.6 + value * 0.12;
}
export function simulateSpring(
  displacement: number,
  damping: number,
  duration = 4,
  dt = 1 / 120,
): SpringPoint[] {
  const stiffness = 18;
  let position = displacement;
  let velocity = 0;
  const points: SpringPoint[] = [{ time: 0, displacement: position }];

  for (let time = dt; time <= duration + dt / 2; time += dt) {
    const acceleration = -stiffness * position - damping * velocity;
    velocity += acceleration * dt;
    position += velocity * dt;
    points.push({ time, displacement: position });
  }

  return points;
}

export function sampleSpring(trace: SpringPoint[], time: number) {
  const index = Math.min(Math.floor(time * 120), trace.length - 1);
  return trace[index].displacement;
}

export type SpringPoint = {
  time: number;
  displacement: number;
};

const stiffness = 18;
const mass = 1;
export const criticalDamping = 2 * Math.sqrt(stiffness * mass);

export function dampingForSlider(value: number) {
  return (value / 50) * criticalDamping;
}
export function simulateSpring(
  displacement: number,
  damping: number,
  duration = 4,
  dt = 1 / 120,
): SpringPoint[] {
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

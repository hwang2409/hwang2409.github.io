export const BALL_RADIUS = 0.18;
export const CONTACT_DT = 1 / 240;
export type ContactPoint = { time: number; height: number; penetration: number };

export function contactStiffness(softness: number) {
  return 120000 * (150 / 120000) ** softness;
}

// Unit mass, unilateral spring-damper contact. Ten fixed substeps resolve
// the stiffest spring without changing the display sampling interval.
export function simulateSoftContact(softness: number): ContactPoint[] {
  const stiffness = contactStiffness(softness);
  const damping = 0.36 * Math.sqrt(stiffness);
  const dt = CONTACT_DT / 10;
  let height = 1.5, velocity = 0;
  const trace: ContactPoint[] = [{ time: 0, height, penetration: 0 }];
  for (let frame = 1; frame <= 960; frame += 1) {
    for (let substep = 0; substep < 10; substep += 1) {
      const penetration = Math.max(0, BALL_RADIUS - height);
      const force = penetration > 0 ? Math.max(0, stiffness * penetration - damping * velocity) : 0;
      velocity += (force - 9.81) * dt;
      height += velocity * dt;
    }
    trace.push({ time: frame * CONTACT_DT, height, penetration: Math.max(0, BALL_RADIUS - height) });
  }
  return trace;
}

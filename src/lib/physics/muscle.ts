import { stepPendulum, type PendulumState } from './pendulum';

// Active curves from newt/docs/actuators.md, lmin=.5, lmax=1.6, fvmax=1.2.
export function muscleLength(length: number) {
  if (length <= 0.5 || length >= 1.6) return 0;
  if (length <= 0.75) return 0.5 * ((length - 0.5) / 0.25) ** 2;
  if (length <= 1) return 1 - 0.5 * ((1 - length) / 0.25) ** 2;
  if (length <= 1.3) return 1 - 0.5 * ((length - 1) / 0.3) ** 2;
  return 0.5 * ((1.6 - length) / 0.3) ** 2;
}

export function muscleVelocity(velocity: number) {
  if (velocity <= -1) return 0;
  if (velocity <= 0) return (velocity + 1) ** 2;
  if (velocity <= 0.2) return 1.2 - (0.2 - velocity) ** 2 / 0.2;
  return 1.2;
}

// Two attachment sites: 0.6 m above the elbow, 0.35 m along the forearm.
export function muscleGeometry(q2: number, v2: number) {
  const length = Math.sqrt(0.6 ** 2 + 0.35 ** 2 + 2 * 0.6 * 0.35 * Math.cos(q2));
  const momentArm = 0.6 * 0.35 * Math.sin(q2) / length;
  return { length, momentArm, velocity: -momentArm * v2 };
}

export function muscleForce(activation: number, length: number, velocity: number) {
  return 100 * activation * muscleLength(length / 0.8) * muscleVelocity(velocity / 1.2);
}

export function createArm() {
  const state: PendulumState = { q1: -0.45, q2: 0.8, v1: 0, v2: 0 };
  return { state, activation: 0, control: 0.45, time: 0 };
}

export function armReadout(arm: ReturnType<typeof createArm>) {
  const geometry = muscleGeometry(arm.state.q2, arm.state.v2);
  const force = muscleForce(arm.activation, geometry.length, geometry.velocity);
  return { ...geometry, force, torque: force * geometry.momentArm };
}

export function stepArm(arm: ReturnType<typeof createArm>, dt: number) {
  const scale = 0.5 + 1.5 * arm.activation;
  const tau = arm.control > arm.activation ? 0.04 * scale : 0.08 / scale;
  arm.activation += dt * (arm.control - arm.activation) / tau;
  // Joint torques include viscous damping. Re-evaluate muscle geometry at every RK4 stage.
  arm.state = stepPendulum(arm.state, dt, s => {
    const g = muscleGeometry(s.q2, s.v2);
    return { shoulder: -0.8 * s.v1, elbow: muscleForce(arm.activation, g.length, g.velocity) * g.momentArm - 0.6 * s.v2 };
  });
  arm.time += dt;
}

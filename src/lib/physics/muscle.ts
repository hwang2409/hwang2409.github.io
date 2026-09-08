import { advancePendulum, pendulumDerivative, type PendulumState } from './pendulum';

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

type ArmState = { state: PendulumState; activation: number };

function armDerivative({ state: s, activation }: ArmState, control: number): ArmState {
  const scale = 0.5 + 1.5 * activation;
  const tau = control > activation ? 0.04 * scale : 0.08 / scale;
  const g = muscleGeometry(s.q2, s.v2);
  return {
    state: pendulumDerivative(s, {
      shoulder: -0.8 * s.v1,
      elbow: muscleForce(activation, g.length, g.velocity) * g.momentArm - 0.6 * s.v2,
    }),
    activation: (control - activation) / tau,
  };
}

function advanceArm(s: ArmState, d: ArmState, dt: number): ArmState {
  return { state: advancePendulum(s.state, d.state, dt), activation: s.activation + d.activation * dt };
}

export function stepArm(arm: ReturnType<typeof createArm>, dt: number) {
  // newt integrates muscle activation alongside position and velocity at each RK4 stage.
  const k1 = armDerivative(arm, arm.control);
  const k2 = armDerivative(advanceArm(arm, k1, dt / 2), arm.control);
  const k3 = armDerivative(advanceArm(arm, k2, dt / 2), arm.control);
  const k4 = armDerivative(advanceArm(arm, k3, dt), arm.control);
  arm.state = advancePendulum(arm.state, {
    q1: (k1.state.q1 + 2 * k2.state.q1 + 2 * k3.state.q1 + k4.state.q1) / 6,
    q2: (k1.state.q2 + 2 * k2.state.q2 + 2 * k3.state.q2 + k4.state.q2) / 6,
    v1: (k1.state.v1 + 2 * k2.state.v1 + 2 * k3.state.v1 + k4.state.v1) / 6,
    v2: (k1.state.v2 + 2 * k2.state.v2 + 2 * k3.state.v2 + k4.state.v2) / 6,
  }, dt);
  arm.activation += dt * (k1.activation + 2 * k2.activation + 2 * k3.activation + k4.activation) / 6;
  arm.time += dt;
}

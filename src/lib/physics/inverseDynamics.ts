import { advancePendulum, pendulumDerivative, type PendulumState } from './pendulum';
export const INVERSE_DT = 1 / 240;
export type JointTorque = { shoulder: number; elbow: number };
export type InversePoint = PendulumState & { time: number; applied: JointTorque; recovered: JointTorque; error: number };

export function torqueProfile(time: number, amplitude: number): JointTorque {
  return { shoulder: amplitude * Math.sin(2 * time), elbow: amplitude * 0.5 * Math.cos(3 * time) };
}

// Independent Cartesian Newton–Euler calculation: find each point mass's
// force from acceleration, then project force onto each joint's lever arm.
export function inverseTorque(s: PendulumState, a1: number, a2: number): JointTorque {
  const c1 = Math.cos(s.q1), s1 = Math.sin(s.q1);
  const c2 = Math.cos(s.q1 + s.q2), s2 = Math.sin(s.q1 + s.q2);
  const w2 = s.v1 + s.v2, alpha2 = a1 + a2;
  const ax1 = c1 * a1 - s1 * s.v1 ** 2;
  const ay1 = -s1 * a1 - c1 * s.v1 ** 2;
  const fx2 = ax1 + c2 * alpha2 - s2 * w2 ** 2;
  const fy2 = ay1 - s2 * alpha2 - c2 * w2 ** 2 - 9.81;
  return { shoulder: c1 * ax1 - s1 * (ay1 - 9.81) + (c1 + c2) * fx2 - (s1 + s2) * fy2,
    elbow: c2 * fx2 - s2 * fy2 };
}

// Evaluate the chosen time-dependent torque at every RK4 stage.
export function stepDrivenArm(state: PendulumState, time: number, amplitude: number, dt: number): PendulumState {
  const k1 = pendulumDerivative(state, torqueProfile(time, amplitude));
  const k2 = pendulumDerivative(advancePendulum(state, k1, dt / 2), torqueProfile(time + dt / 2, amplitude));
  const k3 = pendulumDerivative(advancePendulum(state, k2, dt / 2), torqueProfile(time + dt / 2, amplitude));
  const k4 = pendulumDerivative(advancePendulum(state, k3, dt), torqueProfile(time + dt, amplitude));
  return advancePendulum(state, {
    q1: (k1.q1 + 2 * k2.q1 + 2 * k3.q1 + k4.q1) / 6,
    q2: (k1.q2 + 2 * k2.q2 + 2 * k3.q2 + k4.q2) / 6,
    v1: (k1.v1 + 2 * k2.v1 + 2 * k3.v1 + k4.v1) / 6,
    v2: (k1.v2 + 2 * k2.v2 + 2 * k3.v2 + k4.v2) / 6,
  }, dt);
}

export function simulateInverse(amplitude: number): InversePoint[] {
  let state: PendulumState = { q1: 0.6, q2: 0.8, v1: 0, v2: 0 };
  const trace: InversePoint[] = [];
  for (let frame = 0; frame <= 1440; frame += 1) {
    const time = frame * INVERSE_DT;
    const applied = torqueProfile(time, amplitude);
    const acceleration = pendulumDerivative(state, applied);
    const recovered = inverseTorque(state, acceleration.v1, acceleration.v2);
    trace.push({ ...state, time, applied, recovered,
      error: Math.max(Math.abs(recovered.shoulder - applied.shoulder), Math.abs(recovered.elbow - applied.elbow)) });
    state = stepDrivenArm(state, time, amplitude, INVERSE_DT);
  }
  return trace;
}

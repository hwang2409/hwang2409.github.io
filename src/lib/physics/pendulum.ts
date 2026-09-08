export type PendulumState = { q1: number; q2: number; v1: number; v2: number };
export type PendulumPoint = PendulumState & { time: number };

// Two unit point masses on unit massless rods. q2 is relative to link 1.
// Solve the two coupled Lagrange equations, then integrate with RK4.
type Torque = { shoulder: number; elbow: number };

function derivative(s: PendulumState, torque: Torque): PendulumState {
  const a = s.q1;
  const b = s.q1 + s.q2;
  const u = s.v1;
  const v = s.v1 + s.v2;
  const c = Math.cos(a - b);
  const sn = Math.sin(a - b);
  const r1 = -v * v * sn - 2 * 9.81 * Math.sin(a) + torque.shoulder - torque.elbow;
  const r2 = u * u * sn - 9.81 * Math.sin(b) + torque.elbow;
  const acc1 = (r1 - c * r2) / (2 - c * c);
  const acc2 = (2 * r2 - c * r1) / (2 - c * c);
  return { q1: s.v1, q2: s.v2, v1: acc1, v2: acc2 - acc1 };
}

function advance(s: PendulumState, d: PendulumState, dt: number): PendulumState {
  return { q1: s.q1 + d.q1 * dt, q2: s.q2 + d.q2 * dt, v1: s.v1 + d.v1 * dt, v2: s.v2 + d.v2 * dt };
}

const noTorque = () => ({ shoulder: 0, elbow: 0 });

export function stepPendulum(state: PendulumState, dt: number, torque: (s: PendulumState) => Torque = noTorque): PendulumState {
  const evaluate = (s: PendulumState) => derivative(s, torque(s));
  const k1 = evaluate(state);
  const k2 = evaluate(advance(state, k1, dt / 2));
  const k3 = evaluate(advance(state, k2, dt / 2));
  const k4 = evaluate(advance(state, k3, dt));
  return advance(state, {
    q1: (k1.q1 + 2 * k2.q1 + 2 * k3.q1 + k4.q1) / 6,
    q2: (k1.q2 + 2 * k2.q2 + 2 * k3.q2 + k4.q2) / 6,
    v1: (k1.v1 + 2 * k2.v1 + 2 * k3.v1 + k4.v1) / 6,
    v2: (k1.v2 + 2 * k2.v2 + 2 * k3.v2 + k4.v2) / 6,
  }, dt);
}

export function simulatePendulum(q1: number, q2: number, duration = 40, dt = 0.005): PendulumPoint[] {
  let state: PendulumState = { q1, q2, v1: 0, v2: 0 };
  const trace: PendulumPoint[] = [{ ...state, time: 0 }];
  for (let i = 1; i <= Math.round(duration / dt); i += 1) {
    state = stepPendulum(state, dt);
    trace.push({ ...state, time: i * dt });
  }
  return trace;
}

export function pendulumPositions(s: PendulumState) {
  const x1 = Math.sin(s.q1);
  const y1 = Math.cos(s.q1);
  return { x1, y1, x2: x1 + Math.sin(s.q1 + s.q2), y2: y1 + Math.cos(s.q1 + s.q2) };
}

export function pendulumBytes(trace: PendulumPoint[]) {
  return new Uint8Array(new Float64Array(trace.flatMap(p => [p.time, p.q1, p.q2, p.v1, p.v2])).buffer);
}

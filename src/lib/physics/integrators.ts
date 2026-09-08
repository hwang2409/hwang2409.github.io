export type ProjectileState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type ProjectilePoint = {
  x: number;
  y: number;
};

export type ProjectileIntegrator = 'explicit' | 'semi-implicit' | 'rk4';

const gravity = -9.81;

function derivative(state: ProjectileState): ProjectileState {
  return { x: state.vx, y: state.vy, vx: 0, vy: gravity };
}
function addScaled(state: ProjectileState, change: ProjectileState, scale: number) {
  return {
    x: state.x + change.x * scale,
    y: state.y + change.y * scale,
    vx: state.vx + change.vx * scale,
    vy: state.vy + change.vy * scale,
  };
}

export function stepProjectile(
  state: ProjectileState,
  dt: number,
  integrator: ProjectileIntegrator,
): ProjectileState {
  if (integrator === 'explicit') {
    return {
      x: state.x + state.vx * dt,
      y: state.y + state.vy * dt,
      vx: state.vx,
      vy: state.vy + gravity * dt,
    };
  }

  if (integrator === 'semi-implicit') {
    const vy = state.vy + gravity * dt;
    return {
      x: state.x + state.vx * dt,
      y: state.y + vy * dt,
      vx: state.vx,
      vy,
    };
  }

  const k1 = derivative(state);
  const k2 = derivative(addScaled(state, k1, dt / 2));
  const k3 = derivative(addScaled(state, k2, dt / 2));
  const k4 = derivative(addScaled(state, k3, dt));

  return {
    x: state.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: state.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    vx: state.vx,
    vy: state.vy + (dt / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy),
  };
}

export function simulateProjectile(
  velocity: { x: number; y: number },
  integrator: ProjectileIntegrator,
  dt = 0.17,
  duration = 2.5,
): ProjectilePoint[] {
  let state: ProjectileState = { x: 0, y: 0, vx: velocity.x, vy: velocity.y };
  const points: ProjectilePoint[] = [{ x: state.x, y: state.y }];

  for (let time = 0; time < duration; time += dt) {
    state = stepProjectile(state, dt, integrator);
    points.push({ x: state.x, y: Math.max(0, state.y) });
    if (state.y < 0) break;
  }

  return points;
}

import { body, contactCorrection, Contacts, extent, solveVelocity, type Body } from './contacts';

export const SCENE_DT = 1 / 180;
export const BODY_LIMIT = 25;
export type Scene = ReturnType<typeof createScene>;

export function createScene(wall = false) {
  const bodies: Body[] = [];
  const scene = { bodies, width: 12, height: 8, gravity: 9.81, iterations: 14,
    friction: 0.55, restitution: 0.3, time: 0, serial: 0,
    contacts: new Contacts(BODY_LIMIT * BODY_LIMIT * 2 + BODY_LIMIT * 8),
    ground: body('box', 0, 0, 1, 0) };
  if (wall) {
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 3; x += 1) bodies.push(body('box', 7 + x * 0.62, 0.31 + y * 0.62, 0.3));
    }
  } else {
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 2; x += 1) bodies.push(body('box', 5 + x * 0.64, 0.31 + y * 0.62));
    }
    const ball = body('ball', 3, 5, 0.42, 2);
    ball.vx = 2.5;
    bodies.push(ball);
    const box = body('box', 8, 4, 0.42, 2);
    box.angle = 0.4;
    bodies.push(box);
  }
  return scene;
}

export function spawnBody(scene: Scene, kind: Body['kind'], x?: number, y?: number) {
  if (scene.bodies.length >= BODY_LIMIT) return false;
  const radius = kind === 'ball' ? 0.35 : 0.3;
  const margin = radius * Math.SQRT2;
  const px = Math.max(margin, Math.min(scene.width - margin, x ?? 2 + (scene.serial % 9)));
  const py = Math.max(margin, Math.min(scene.height - margin, y ?? 6.5));
  // Do not inject energy by creating deeply intersecting bodies.
  for (const b of scene.bodies) {
    if (Math.abs(b.x - px) < extent(b) + margin && Math.abs(b.y - py) < extent(b) + margin) return false;
  }
  scene.bodies.push(body(kind, px, py, radius));
  scene.serial += 1;
  return true;
}

export function fireProjectile(scene: Scene, angle: number, speed: number) {
  if (scene.bodies.length >= BODY_LIMIT) return false;
  if (scene.bodies.some(b => Math.hypot(b.x - 1, b.y - 1.1) < extent(b) + 0.45)) return false;
  const shot = body('ball', 1, 1.1, 0.42, 8);
  shot.vx = speed * Math.cos(angle); shot.vy = speed * Math.sin(angle);
  scene.bodies.push(shot);
  return true;
}

function detect(scene: Scene) {
  const { bodies, contacts, ground, restitution } = scene;
  contacts.count = 0;
  for (let i = 0; i < bodies.length; i += 1) {
    const b = bodies[i];
    for (let side = 0; side < 4; side += 1) {
      const nx = side === 0 ? 1 : side === 1 ? -1 : 0;
      const ny = side === 2 ? 1 : side === 3 ? -1 : 0;
      const plane = side === 1 ? -scene.width : side === 3 ? -scene.height : 0;
      const c = Math.cos(b.angle), s = Math.sin(b.angle);
      const corners = b.kind === 'ball' ? 1 : 4;
      for (let corner = 0; corner < corners; corner += 1) {
        const lx = (corner % 2 ? 1 : -1) * b.radius;
        const ly = (corner < 2 ? -1 : 1) * b.radius;
        const x = b.kind === 'ball' ? b.x - nx * b.radius : b.x + c * lx - s * ly;
        const y = b.kind === 'ball' ? b.y - ny * b.radius : b.y + s * lx + c * ly;
        const depth = plane - x * nx - y * ny;
        if (depth > 0) contacts.add(ground, b, x, y, nx, ny, depth, restitution);
      }
    }
    for (let j = i + 1; j < bodies.length; j += 1) contacts.pair(b, bodies[j], restitution);
  }
}

export function stepScene(scene: Scene, dt = SCENE_DT) {
  for (const b of scene.bodies) {
    b.vy -= scene.gravity * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.angle += b.spin * dt;
  }
  detect(scene);
  for (let sweep = 0; sweep < scene.iterations; sweep += 1) {
    for (let i = 0; i < scene.contacts.count; i += 1) solveVelocity(scene.contacts.rows[i], scene.friction);
  }
  // Re-detect each projection sweep: a correction changes neighboring contacts.
  // Split position correction from impulses so overlap repair adds no velocity.
  for (let sweep = 0; sweep < scene.iterations; sweep += 1) {
    if (sweep) detect(scene);
    for (let i = 0; i < scene.contacts.count; i += 1) {
      const row = scene.contacts.rows[i];
      const correction = 0.4 * contactCorrection(row.depth - 0.001, row.a.inverseMass, row.b.inverseMass);
      row.a.x -= row.nx * correction * row.a.inverseMass;
      row.a.y -= row.ny * correction * row.a.inverseMass;
      row.b.x += row.nx * correction * row.b.inverseMass;
      row.b.y += row.ny * correction * row.b.inverseMass;
    }
  }
  scene.time += dt;
}

export function sceneEnergy(scene: Scene) {
  let energy = 0;
  for (const b of scene.bodies) {
    energy += b.mass * (0.5 * (b.vx * b.vx + b.vy * b.vy) + scene.gravity * b.y)
      + 0.5 * b.spin * b.spin / b.inverseInertia;
  }
  return energy;
}

// Shared accumulator for live scenes. Visibility pauses are handled by the shell.
export function createClock(dt: number) {
  let previous = 0, remainder = 0;
  return (elapsed: number, advance: () => void) => {
    const current = Math.max(0, elapsed) / 1000;
    remainder += Math.min(0.35, Math.max(0, current - previous));
    previous = current;
    while (remainder + 1e-12 >= dt) {
      advance();
      remainder -= dt;
    }
  };
}

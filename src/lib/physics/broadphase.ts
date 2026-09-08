export type Drifter = { x: number; y: number; vx: number; vy: number; radius: number; id: number };
export type BroadPhase = ReturnType<typeof createBroadPhase>;

export function createBroadPhase(count = 40) {
  let seed = 32;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const bodies: Drifter[] = Array.from({ length: count }, (_, id) => ({
    id, x: 0.5 + random() * 11, y: 0.5 + random() * 6,
    vx: (random() - 0.5) * 1.4, vy: (random() - 0.5) * 1.4, radius: 0.12 + random() * 0.2,
  }));
  return { bodies, width: 12, height: 7, order: bodies.slice(),
    pairs: new Uint16Array(count * (count - 1)), count: 0, comparisons: 0 };
}

export function stepBroadPhase(scene: BroadPhase, dt: number) {
  for (const b of scene.bodies) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < b.radius) { b.x = 2 * b.radius - b.x; b.vx = Math.abs(b.vx); }
    if (b.x > scene.width - b.radius) { b.x = 2 * (scene.width - b.radius) - b.x; b.vx = -Math.abs(b.vx); }
    if (b.y < b.radius) { b.y = 2 * b.radius - b.y; b.vy = Math.abs(b.vy); }
    if (b.y > scene.height - b.radius) { b.y = 2 * (scene.height - b.radius) - b.y; b.vy = -Math.abs(b.vy); }
  }
}

export function findPairs(scene: BroadPhase, sweep: boolean) {
  scene.count = 0; scene.comparisons = 0;
  const order = sweep ? scene.order : scene.bodies;
  // Insertion sort reuses the almost-sorted order and breaks ties by stable id.
  if (sweep) {
    for (let i = 1; i < order.length; i += 1) {
      const b = order[i];
      let j = i - 1;
      while (j >= 0 && (order[j].x - order[j].radius > b.x - b.radius
        || (order[j].x - order[j].radius === b.x - b.radius && order[j].id > b.id))) {
        order[j + 1] = order[j]; j -= 1;
      }
      order[j + 1] = b;
    }
  }
  for (let i = 0; i < order.length; i += 1) {
    const a = order[i];
    for (let j = i + 1; j < order.length; j += 1) {
      const b = order[j];
      if (sweep && b.x - b.radius > a.x + a.radius) break;
      scene.comparisons += 1;
      if (sweep && Math.abs(a.y - b.y) > a.radius + b.radius) continue;
      scene.pairs[scene.count * 2] = a.id;
      scene.pairs[scene.count * 2 + 1] = b.id;
      scene.count += 1;
    }
  }
  return scene.count;
}

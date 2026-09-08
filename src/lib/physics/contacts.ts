export type Body = {
  x: number; y: number; vx: number; vy: number;
  angle: number; spin: number; radius: number;
  kind: 'box' | 'ball'; mass: number; inverseMass: number; inverseInertia: number;
};

export type Contact = {
  a: Body; b: Body; x: number; y: number; nx: number; ny: number;
  depth: number; normal: number; tangent: number; bounce: number;
};

export function body(kind: Body['kind'], x: number, y: number, radius = 0.3, mass = 1): Body {
  return { kind, x, y, radius, mass, inverseMass: mass ? 1 / mass : 0,
    inverseInertia: mass ? 1 / (mass * radius * radius * (kind === 'ball' ? 0.5 : 2 / 3)) : 0,
    vx: 0, vy: 0, angle: 0, spin: 0 };
}

// The vertical stack and the composed scenes use the same mass-weighted projection.
export function contactCorrection(depth: number, inverseMassA: number, inverseMassB: number) {
  return Math.max(0, depth) / (inverseMassA + inverseMassB);
}

export function extent(b: Body) {
  return b.kind === 'ball' ? b.radius : b.radius * (Math.abs(Math.cos(b.angle)) + Math.abs(Math.sin(b.angle)));
}

// Reused contact storage and clipping scratch; no allocations during a step.
export class Contacts {
  rows: Contact[];
  count = 0;
  private edgeA = new Float64Array(4);
  private edgeB = new Float64Array(4);

  constructor(capacity: number) {
    const dummy = body('ball', 0, 0, 1, 0);
    this.rows = Array.from({ length: capacity }, () => ({ a: dummy, b: dummy,
      x: 0, y: 0, nx: 0, ny: 0, depth: 0, normal: 0, tangent: 0, bounce: 0 }));
  }

  add(a: Body, b: Body, x: number, y: number, nx: number, ny: number, depth: number, restitution: number) {
    const row = this.rows[this.count++];
    row.a = a; row.b = b; row.x = x; row.y = y;
    row.nx = nx; row.ny = ny; row.depth = depth;
    row.normal = 0; row.tangent = 0;
    const velocity = normalVelocity(row, nx, ny);
    row.bounce = velocity < -1 ? -restitution * velocity : 0;
  }

  pair(a: Body, b: Body, restitution: number) {
    const dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dx) > extent(a) + extent(b) || Math.abs(dy) > extent(a) + extent(b)) return;
    if (a.kind === 'ball' && b.kind === 'ball') {
      const distance = Math.hypot(dx, dy);
      const depth = a.radius + b.radius - distance;
      if (depth <= 0) return;
      const nx = distance ? dx / distance : 1, ny = distance ? dy / distance : 0;
      this.add(a, b, a.x + nx * (a.radius - depth / 2), a.y + ny * (a.radius - depth / 2), nx, ny, depth, restitution);
    } else if (a.kind === 'box' && b.kind === 'box') {
      this.boxes(a, b, restitution);
    } else {
      this.ballBox(a.kind === 'ball' ? a : b, a.kind === 'box' ? a : b, restitution);
    }
  }

  private ballBox(ball: Body, box: Body, restitution: number) {
    const c = Math.cos(box.angle), s = Math.sin(box.angle);
    const dx = ball.x - box.x, dy = ball.y - box.y;
    const lx = c * dx + s * dy, ly = -s * dx + c * dy;
    let x = Math.max(-box.radius, Math.min(box.radius, lx));
    let y = Math.max(-box.radius, Math.min(box.radius, ly));
    let nx = lx - x, ny = ly - y;
    let distance = Math.hypot(nx, ny);
    if (distance > ball.radius) return;
    if (distance === 0) {
      if (box.radius - Math.abs(lx) < box.radius - Math.abs(ly)) {
        nx = lx >= 0 ? 1 : -1; ny = 0; x = nx * box.radius;
        distance = -(box.radius - Math.abs(lx));
      } else {
        nx = 0; ny = ly >= 0 ? 1 : -1; y = ny * box.radius;
        distance = -(box.radius - Math.abs(ly));
      }
    } else { nx /= distance; ny /= distance; }
    this.add(box, ball, box.x + c * x - s * y, box.y + s * x + c * y,
      c * nx - s * ny, s * nx + c * ny, ball.radius - distance, restitution);
  }

  private boxes(a: Body, b: Body, restitution: number) {
    let depth = Infinity, nx = 0, ny = 0;
    let reference = a, incident = b;
    for (let axis = 0; axis < 4; axis += 1) {
      const owner = axis < 2 ? a : b;
      const angle = owner.angle + (axis % 2) * Math.PI / 2;
      let x = Math.cos(angle), y = Math.sin(angle);
      const delta = (b.x - a.x) * x + (b.y - a.y) * y;
      const overlap = projectedRadius(a, x, y) + projectedRadius(b, x, y) - Math.abs(delta);
      if (overlap <= 0) return;
      if (overlap < depth) {
        depth = overlap;
        if (delta < 0) { x = -x; y = -y; }
        nx = x; ny = y;
        reference = owner; incident = owner === a ? b : a;
      }
    }
    // Clip the incident face against the reference face's side planes.
    if (reference === b) { nx = -nx; ny = -ny; }
    supportEdge(reference, nx, ny, this.edgeA);
    supportEdge(incident, -nx, -ny, this.edgeB);
    const tx = -ny, ty = nx;
    const r0 = this.edgeA[0] * tx + this.edgeA[1] * ty;
    const r1 = this.edgeA[2] * tx + this.edgeA[3] * ty;
    const p0 = this.edgeB[0] * tx + this.edgeB[1] * ty;
    const p1 = this.edgeB[2] * tx + this.edgeB[3] * ty;
    let lo = 0, hi = 1;
    if (Math.abs(p1 - p0) > 1e-10) {
      const t0 = (Math.min(r0, r1) - p0) / (p1 - p0);
      const t1 = (Math.max(r0, r1) - p0) / (p1 - p0);
      lo = Math.max(0, Math.min(t0, t1)); hi = Math.min(1, Math.max(t0, t1));
    } else if (p0 < Math.min(r0, r1) || p0 > Math.max(r0, r1)) return;
    if (lo > hi) return;
    const plane = this.edgeA[0] * nx + this.edgeA[1] * ny;
    for (let end = 0; end < 2; end += 1) {
      const t = end ? hi : lo;
      const x = this.edgeB[0] + (this.edgeB[2] - this.edgeB[0]) * t;
      const y = this.edgeB[1] + (this.edgeB[3] - this.edgeB[1]) * t;
      const separation = plane - x * nx - y * ny;
      if (separation >= 0) this.add(reference, incident, x, y, nx, ny, separation, restitution);
      if (hi - lo < 1e-8) break;
    }
  }
}

function projectedRadius(b: Body, nx: number, ny: number) {
  const c = Math.cos(b.angle), s = Math.sin(b.angle);
  return b.radius * (Math.abs(nx * c + ny * s) + Math.abs(-nx * s + ny * c));
}

function supportEdge(b: Body, nx: number, ny: number, out: Float64Array) {
  const c = Math.cos(b.angle), s = Math.sin(b.angle);
  const x = nx * c + ny * s, y = -nx * s + ny * c;
  const fx = Math.abs(x) > Math.abs(y) ? Math.sign(x) : 0;
  const fy = fx ? 0 : Math.sign(y);
  for (let i = 0; i < 2; i += 1) {
    const sign = i ? 1 : -1;
    const lx = (fx - fy * sign) * b.radius, ly = (fy + fx * sign) * b.radius;
    out[i * 2] = b.x + c * lx - s * ly;
    out[i * 2 + 1] = b.y + s * lx + c * ly;
  }
}

function normalVelocity(row: Contact, nx: number, ny: number) {
  const { a, b, x, y } = row;
  return (b.vx - b.spin * (y - b.y) - a.vx + a.spin * (y - a.y)) * nx
    + (b.vy + b.spin * (x - b.x) - a.vy - a.spin * (x - a.x)) * ny;
}

function impulse(row: Contact, nx: number, ny: number, amount: number) {
  const { a, b, x, y } = row;
  a.vx -= amount * nx * a.inverseMass; a.vy -= amount * ny * a.inverseMass;
  b.vx += amount * nx * b.inverseMass; b.vy += amount * ny * b.inverseMass;
  a.spin -= amount * ((x - a.x) * ny - (y - a.y) * nx) * a.inverseInertia;
  b.spin += amount * ((x - b.x) * ny - (y - b.y) * nx) * b.inverseInertia;
}

function effectiveMass(row: Contact, nx: number, ny: number) {
  const { a, b, x, y } = row;
  const ra = (x - a.x) * ny - (y - a.y) * nx;
  const rb = (x - b.x) * ny - (y - b.y) * nx;
  return a.inverseMass + b.inverseMass + ra * ra * a.inverseInertia + rb * rb * b.inverseInertia;
}

export function solveVelocity(row: Contact, friction: number) {
  const { nx, ny } = row;
  const normal = Math.max(0, row.normal + (row.bounce - normalVelocity(row, nx, ny)) / effectiveMass(row, nx, ny));
  impulse(row, nx, ny, normal - row.normal);
  row.normal = normal;
  const limit = friction * normal;
  const tangent = Math.max(-limit, Math.min(limit, row.tangent - normalVelocity(row, -ny, nx) / effectiveMass(row, -ny, nx)));
  impulse(row, -ny, nx, tangent - row.tangent);
  row.tangent = tangent;
}

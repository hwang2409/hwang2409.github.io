import { clipDistance, transform } from './transform';

export const stages = ['vertices', 'wireframe', 'backface-culled', 'flat', 'gouraud', 'blinn-phong'] as const;
export type Stage = typeof stages[number];
const stride = 11; // clip xyzw, view normal xyz, view position xyz, vertex intensity

export function signedArea(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

export function depthTest(buffer: Float64Array, index: number, depth: number) {
  if (depth >= buffer[index]) return false;
  buffer[index] = depth;
  return true;
}

function light(nx: number, ny: number, nz: number, x: number, y: number, z: number) {
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl; ny /= nl; nz /= nl;
  const diffuse = Math.max(0, nx * -0.4 + ny * 0.6 + nz * 0.692820323);
  const vl = Math.hypot(x, y, z) || 1;
  const hx = -0.4 - x / vl, hy = 0.6 - y / vl, hz = 0.692820323 - z / vl;
  const hl = Math.hypot(hx, hy, hz) || 1;
  const specular = diffuse > 0 ? Math.max(0, (nx * hx + ny * hy + nz * hz) / hl) ** 48 : 0;
  return Math.min(1, 0.025 + 0.48 * diffuse + 0.65 * specular);
}

function topLeft(ax: number, ay: number, bx: number, by: number) {
  return by < ay || (by === ay && bx > ax);
}

export class Pipeline {
  readonly pixels: Uint8ClampedArray;
  readonly depth: Float64Array;
  readonly rejected: Uint8Array;
  // Screen records: x, y, depth, 1/w, then perspective-divided attributes.
  // Clipping can turn one submitted face into several raster triangles.
  private readonly triangles = new Float64Array(2048 * 3 * stride);
  private readonly flat = new Float64Array(2048);
  private readonly clipA = new Float64Array(12 * stride);
  private readonly clipB = new Float64Array(12 * stride);
  private readonly point = new Float64Array(4);
  triangleCount = 0;
  drawn = 0;
  culled = 0;
  shaded = 0;
  rejectedCount = 0;
  stage: Stage = 'blinn-phong';

  constructor(readonly width: number, readonly height: number) {
    this.pixels = new Uint8ClampedArray(width * height * 4);
    this.depth = new Float64Array(width * height);
    this.rejected = new Uint8Array(width * height);
    this.clear();
  }

  clear() {
    this.pixels.fill(255);
    this.depth.fill(Infinity);
    this.rejected.fill(0);
    this.shaded = this.rejectedCount = 0;
  }

  begin(stage: Stage) {
    this.stage = stage;
    this.triangleCount = this.drawn = this.culled = 0;
    this.clear();
  }

  submit(mesh: Float64Array, model: Float64Array, view: Float64Array, projection: Float64Array) {
    for (let face = 0; face < mesh.length; face += 9) {
      for (let vertex = 0; vertex < 3; vertex += 1) {
        const source = face + vertex * 3, target = vertex * stride;
        transform(this.point, 0, model, mesh[source], mesh[source + 1], mesh[source + 2]);
        transform(this.point, 0, view, this.point[0], this.point[1], this.point[2]);
        this.clipA[target + 7] = this.point[0]; this.clipA[target + 8] = this.point[1]; this.clipA[target + 9] = this.point[2];
        transform(this.clipA, target, projection, this.point[0], this.point[1], this.point[2]);
        // All teaching scenes use rigid transforms and uniform scale.
        transform(this.point, 0, model, mesh[source], mesh[source + 1], mesh[source + 2], 0);
        transform(this.point, 0, view, this.point[0], this.point[1], this.point[2], 0);
        for (let axis = 0; axis < 3; axis += 1) this.clipA[target + 4 + axis] = this.point[axis];
        this.clipA[target + 10] = light(this.point[0], this.point[1], this.point[2],
          this.clipA[target + 7], this.clipA[target + 8], this.clipA[target + 9]);
      }
      const a = this.clipA;
      const ux = a[18] - a[7], uy = a[19] - a[8], uz = a[20] - a[9];
      const vx = a[29] - a[7], vy = a[30] - a[8], vz = a[31] - a[9];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const backface = nx * a[7] + ny * a[8] + nz * a[9] >= 0;
      if (backface && this.stage !== 'vertices' && this.stage !== 'wireframe') { this.culled += 1; continue; }
      const flat = light(nx, ny, nz, (a[7] + a[18] + a[29]) / 3, (a[8] + a[19] + a[30]) / 3, (a[9] + a[20] + a[31]) / 3);
      const before = this.triangleCount;
      this.clip(flat);
      if (this.triangleCount > before) this.drawn += 1;
      else this.culled += 1;
    }
  }

  private clip(flat: number) {
    let input = this.clipA, output = this.clipB, count = 3;
    for (let plane = 0; plane < 6 && count > 0; plane += 1) {
      let next = 0;
      for (let i = 0; i < count; i += 1) {
        const a = i * stride, b = ((i + 1) % count) * stride;
        const da = clipDistance(input, a, plane), db = clipDistance(input, b, plane);
        if (da >= 0) {
          for (let k = 0; k < stride; k += 1) output[next * stride + k] = input[a + k];
          next += 1;
        }
        if ((da < 0) !== (db < 0)) {
          const t = da / (da - db);
          for (let k = 0; k < stride; k += 1) output[next * stride + k] = input[a + k] + t * (input[b + k] - input[a + k]);
          next += 1;
        }
      }
      const swap = input; input = output; output = swap; count = next;
    }
    for (let i = 1; i < count - 1; i += 1) {
      if (this.triangleCount >= this.flat.length) throw new Error('teaching scene exceeds triangle capacity');
      const target = this.triangleCount * 3 * stride;
      for (let j = 0; j < 3; j += 1) {
        const source = (j === 0 ? 0 : i + j - 1) * stride, dest = target + j * stride;
        const inverseW = 1 / input[source + 3];
        this.triangles[dest] = (input[source] * inverseW + 1) * this.width / 2;
        this.triangles[dest + 1] = (1 - input[source + 1] * inverseW) * this.height / 2;
        this.triangles[dest + 2] = (input[source + 2] * inverseW + 1) / 2;
        this.triangles[dest + 3] = inverseW;
        for (let k = 4; k < stride; k += 1) this.triangles[dest + k] = input[source + k] * inverseW;
      }
      this.flat[this.triangleCount] = flat;
      this.triangleCount += 1;
    }
  }

  private gray(index: number, value: number) {
    const p = index * 4;
    this.pixels[p] = this.pixels[p + 1] = this.pixels[p + 2] = value;
  }

  private line(ax: number, ay: number, bx: number, by: number) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))));
    for (let i = 0; i <= steps; i += 1) {
      const x = Math.floor(ax + (bx - ax) * i / steps), y = Math.floor(ay + (by - ay) * i / steps);
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) this.gray(y * this.width + x, 35);
    }
  }

  render() {
    if (this.stage === 'vertices' || this.stage === 'wireframe' || this.stage === 'backface-culled') {
      for (let i = 0; i < this.triangleCount * 3 * stride; i += 3 * stride) {
        for (let j = 0; j < 3; j += 1) {
          const a = i + j * stride, b = i + ((j + 1) % 3) * stride;
          if (this.stage === 'vertices') {
            const x = this.triangles[a], y = this.triangles[a + 1];
            this.line(x - 1, y, x + 1, y); this.line(x, y - 1, x, y + 1);
          } else this.line(this.triangles[a], this.triangles[a + 1], this.triangles[b], this.triangles[b + 1]);
        }
      }
    } else for (let row = 0; row < this.height; row += 1) this.scanline(row);
  }

  scanline(row: number) {
    if (row < 0 || row >= this.height || !Number.isInteger(row)) return;
    const v = this.triangles, py = row + 0.5;
    for (let triangle = 0; triangle < this.triangleCount; triangle += 1) {
      const a = triangle * 3 * stride;
      let b = a + stride, c = b + stride;
      let area = signedArea(v[a], v[a + 1], v[b], v[b + 1], v[c], v[c + 1]);
      if (area === 0) continue;
      if (area < 0) { const swap = b; b = c; c = swap; area = -area; }
      if (py < Math.min(v[a + 1], v[b + 1], v[c + 1]) || py > Math.max(v[a + 1], v[b + 1], v[c + 1])) continue;
      const minX = Math.max(0, Math.ceil(Math.min(v[a], v[b], v[c]) - 0.5));
      const maxX = Math.min(this.width - 1, Math.floor(Math.max(v[a], v[b], v[c]) - 0.5));
      for (let x = minX; x <= maxX; x += 1) {
        const px = x + 0.5;
        const ea = signedArea(v[b], v[b + 1], v[c], v[c + 1], px, py);
        const eb = signedArea(v[c], v[c + 1], v[a], v[a + 1], px, py);
        const ec = signedArea(v[a], v[a + 1], v[b], v[b + 1], px, py);
        if (ea < 0 || eb < 0 || ec < 0 ||
          (ea === 0 && !topLeft(v[b], v[b + 1], v[c], v[c + 1])) ||
          (eb === 0 && !topLeft(v[c], v[c + 1], v[a], v[a + 1])) ||
          (ec === 0 && !topLeft(v[a], v[a + 1], v[b], v[b + 1]))) continue;
        const wa = ea / area, wb = eb / area, wc = ec / area, index = row * this.width + x;
        const depth = wa * v[a + 2] + wb * v[b + 2] + wc * v[c + 2];
        if (!depthTest(this.depth, index, depth)) {
          this.rejected[index] = 1; this.rejectedCount += 1; continue;
        }
        const w = 1 / (wa * v[a + 3] + wb * v[b + 3] + wc * v[c + 3]);
        let intensity = this.flat[triangle];
        if (this.stage === 'gouraud') intensity = (wa * v[a + 10] + wb * v[b + 10] + wc * v[c + 10]) * w;
        if (this.stage === 'blinn-phong') intensity = light(
          wa * v[a + 4] + wb * v[b + 4] + wc * v[c + 4],
          wa * v[a + 5] + wb * v[b + 5] + wc * v[c + 5],
          wa * v[a + 6] + wb * v[b + 6] + wc * v[c + 6],
          (wa * v[a + 7] + wb * v[b + 7] + wc * v[c + 7]) * w,
          (wa * v[a + 8] + wb * v[b + 8] + wc * v[c + 8]) * w,
          (wa * v[a + 9] + wb * v[b + 9] + wc * v[c + 9]) * w);
        this.gray(index, 255 * (1.055 * intensity ** (1 / 2.4) - 0.055));
        this.shaded += 1;
      }
    }
  }
}

import { createFrame, writeGray, type RasterFrame } from './frame';
import { identity, transform } from './transform';
import { clamp } from './triangle';

export type Projection = 'perspective' | 'orthographic';

export function cameraProjection(mode: Projection, fov: number, aspect = 1, near = 1, far = 20) {
  const matrix = new Float64Array(16);
  if (mode === 'orthographic') {
    identity(matrix);
    matrix[0] = 1 / (3 * aspect); matrix[5] = 1 / 3;
    matrix[10] = -2 / (far - near); matrix[14] = -(far + near) / (far - near);
  } else {
    const focal = 1 / Math.tan(fov * Math.PI / 360);
    matrix[0] = focal / aspect; matrix[5] = focal;
    matrix[10] = -(far + near) / (far - near); matrix[11] = -1;
    matrix[14] = -2 * far * near / (far - near);
  }
  return matrix;
}

// Clip a software line to the framebuffer before stepping, so work stays bounded.
export function rasterLine(frame: RasterFrame, ax: number, ay: number, bx: number, by: number, gray = 0) {
  const dx = bx - ax, dy = by - ay;
  let start = 0, end = 1;
  for (let axis = 0; axis < 2; axis += 1) {
    const origin = axis === 0 ? ax : ay, delta = axis === 0 ? dx : dy;
    const limit = (axis === 0 ? frame.width : frame.height) - 1;
    if (delta === 0) { if (origin < 0 || origin > limit) return; }
    else {
      const a = -origin / delta, b = (limit - origin) / delta;
      start = Math.max(start, Math.min(a, b)); end = Math.min(end, Math.max(a, b));
    }
  }
  if (start > end) return;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * (end - start)));
  for (let step = 0; step <= steps; step += 1) {
    const t = start + (end - start) * step / steps;
    writeGray(frame, clamp(Math.round(ax + dx * t), 0, frame.width - 1),
      clamp(Math.round(ay + dy * t), 0, frame.height - 1), gray);
  }
}

export function renderProjection(mode: Projection, fov: number) {
  const frame = createFrame(240, 180), matrix = cameraProjection(mode, fov, 4 / 3);
  const points = new Float64Array(6 * 4 * 4);
  // Equal rectangular frames form one corridor. A fixed oblique view reveals depth in ortho too.
  for (let gate = 0; gate < 6; gate += 1) {
    for (let corner = 0; corner < 4; corner += 1) {
      const x = corner === 0 || corner === 3 ? -1.1 : 1.1;
      const y = corner < 2 ? -0.9 : 0.9, z = gate - 2.5;
      const vx = x * Math.cos(0.3) + z * Math.sin(0.3);
      const vz = -x * Math.sin(0.3) + z * Math.cos(0.3);
      const offset = (gate * 4 + corner) * 4;
      transform(points, offset, matrix, vx, y * Math.cos(0.2) - vz * Math.sin(0.2),
        y * Math.sin(0.2) + vz * Math.cos(0.2) - 6);
      points[offset] = (points[offset] / points[offset + 3] + 1) * frame.width / 2;
      points[offset + 1] = (1 - points[offset + 1] / points[offset + 3]) * frame.height / 2;
    }
  }
  for (let gate = 0; gate < 6; gate += 1) {
    for (let corner = 0; corner < 4; corner += 1) {
      const a = (gate * 4 + corner) * 4, b = (gate * 4 + (corner + 1) % 4) * 4;
      rasterLine(frame, points[a], points[a + 1], points[b], points[b + 1], 0.35);
      if (gate < 5) rasterLine(frame, points[a], points[a + 1], points[a + 16], points[a + 17]);
    }
  }
  return frame;
}

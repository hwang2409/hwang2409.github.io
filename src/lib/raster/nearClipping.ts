import { createFrame, writeGray } from './frame';
import { cameraProjection, rasterLine } from './cameraProjection';
import { transform } from './transform';
import { rasterize } from './triangle';

// View-space z <= -near is equivalent to clip-space z+w >= 0 for this projection.
// Return a convex polygon of at most four xyz vertices in the caller's buffer.
export function clipNear(input: Float64Array, output: Float64Array, near: number) {
  let count = 0;
  for (let vertex = 0; vertex < 3; vertex += 1) {
    const a = vertex * 3, b = ((vertex + 1) % 3) * 3;
    const da = -near - input[a + 2], db = -near - input[b + 2];
    if (da >= 0) {
      for (let axis = 0; axis < 3; axis += 1) output[count * 3 + axis] = input[a + axis];
      count += 1;
    }
    // Strict crossing avoids duplicate vertices when an endpoint lies on the plane.
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      for (let axis = 0; axis < 2; axis += 1) output[count * 3 + axis] = input[a + axis] + t * (input[b + axis] - input[a + axis]);
      output[count * 3 + 2] = -near;
      count += 1;
    }
  }
  return count;
}

export function renderNearClipping(dolly: number, clipping: boolean) {
  const input = new Float64Array([-0.4, 0.6, -1.13 + dolly, -0.9, -0.65, -3.13 + dolly, 1, -0.6, -4.13 + dolly]);
  const output = new Float64Array(12), near = 1;
  const count = clipping ? clipNear(input, output, near) : 3;
  if (!clipping) output.set(input);
  const frame = createFrame(160, 160), projected = new Float64Array(16);
  const matrix = cameraProjection('perspective', 70);
  let singular = false;
  for (let vertex = 0; vertex < count; vertex += 1) {
    const source = vertex * 3, target = vertex * 4;
    transform(projected, target, matrix, output[source], output[source + 1], output[source + 2]);
    if (projected[target + 3] === 0) { singular = true; continue; }
    projected[target] = (projected[target] / projected[target + 3] + 1) * frame.width / 2;
    projected[target + 1] = (1 - projected[target + 1] / projected[target + 3]) * frame.height / 2;
  }
  if (!singular) {
    const point = (vertex: number) => ({ x: projected[vertex * 4], y: projected[vertex * 4 + 1] });
    for (let vertex = 1; vertex < count - 1; vertex += 1) {
      rasterize([point(0), point(vertex), point(vertex + 1)], frame.width, frame.height,
        (x, y) => writeGray(frame, x, y, vertex === 1 ? 0.6 : 0.8));
      for (const [a, b] of [[0, vertex], [vertex, vertex + 1], [vertex + 1, 0]]) {
        rasterLine(frame, projected[a * 4], projected[a * 4 + 1], projected[b * 4], projected[b * 4 + 1]);
      }
    }
  }
  return { frame, input, output, count, near, singular };
}

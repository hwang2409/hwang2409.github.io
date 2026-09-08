import { createFrame, writeGray } from './frame';
import { interpolate, rasterize, type Triangle, type Weights } from './triangle';

type DepthTriangle = { points: Triangle; depths: Weights; tone: number };

// Orthographic projection makes these vertex depths affine in screen space.
export function renderDepth(depthTest: boolean, reverse: boolean) {
  const frame = createFrame(240, 180);
  const depth = new Float64Array(frame.width * frame.height).fill(Infinity);
  const triangles: DepthTriangle[] = [
    { points: [{ x: 24, y: 150 }, { x: 120, y: 18 }, { x: 216, y: 150 }], depths: [0.15, 0.5, 0.85], tone: 0.18 },
    { points: [{ x: 24, y: 42 }, { x: 216, y: 42 }, { x: 120, y: 168 }], depths: [0.85, 0.15, 0.5], tone: 0.7 },
  ];
  // Both average depths are equal. Either whole-triangle ordering loses.
  if (reverse) triangles.reverse();
  for (const triangle of triangles) {
    rasterize(triangle.points, frame.width, frame.height, (x, y, weights) => {
      const z = interpolate(triangle.depths, weights);
      const index = y * frame.width + x;
      if (!depthTest || z < depth[index]) {
        depth[index] = z;
        writeGray(frame, x, y, triangle.tone);
      }
    });
  }
  return frame;
}

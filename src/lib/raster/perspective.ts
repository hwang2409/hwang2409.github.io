import { createFrame, writeGray } from './frame';
import { clamp, interpolate, rasterize, type Weights } from './triangle';

export function perspectiveAttribute(values: Weights, inverseW: Weights, weights: Weights) {
  const numerator: Weights = [values[0] * inverseW[0], values[1] * inverseW[1], values[2] * inverseW[2]];
  return interpolate(numerator, weights) / interpolate(inverseW, weights);
}

export function renderChecker(tilt: number, perspective: boolean) {
  const frame = createFrame(180, 210);
  const angle = clamp(tilt, 0, 72) * Math.PI / 180;
  const projected = [
    { x: -1, y: -1, u: 0, v: 0 }, { x: 1, y: -1, u: 1, v: 0 },
    { x: 1, y: 1, u: 1, v: 1 }, { x: -1, y: 1, u: 0, v: 1 },
  ].map((p) => {
    const w = 2.5 + p.y * Math.sin(angle);
    return { x: p.x / w, y: -p.y * Math.cos(angle) / w, inverseW: 1 / w, u: p.u, v: p.v };
  });
  const minX = Math.min(...projected.map((p) => p.x));
  const maxX = Math.max(...projected.map((p) => p.x));
  const minY = Math.min(...projected.map((p) => p.y));
  const maxY = Math.max(...projected.map((p) => p.y));
  const scale = Math.min((frame.width - 20) / (maxX - minX), (frame.height - 32) / (maxY - minY));
  const vertices = projected.map((p) => ({
    ...p,
    x: frame.width / 2 + (p.x - (minX + maxX) / 2) * scale,
    y: frame.height / 2 + (p.y - (minY + maxY) / 2) * scale,
  }));
  const faces = [[0, 1, 2], [0, 2, 3]];
  const tiles = 10;
  for (const face of faces) {
    const [a, b, c] = face.map((index) => vertices[index]);
    const inverseW: Weights = [a.inverseW, b.inverseW, c.inverseW];
    const us: Weights = [a.u, b.u, c.u];
    const vs: Weights = [a.v, b.v, c.v];
    rasterize([a, b, c], frame.width, frame.height, (x, y, weights) => {
      const u = perspective ? perspectiveAttribute(us, inverseW, weights) : interpolate(us, weights);
      const v = perspective ? perspectiveAttribute(vs, inverseW, weights) : interpolate(vs, weights);
      const column = clamp(Math.floor(u * tiles), 0, tiles - 1);
      const row = clamp(Math.floor(v * tiles), 0, tiles - 1);
      writeGray(frame, x, y, (column + row) % 2 === 0 ? 0.12 : 0.86);
    });
  }
  return frame;
}

export type Point = { x: number; y: number };
export type Triangle = readonly [Point, Point, Point];
export type Weights = readonly [number, number, number];

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function edge(a: Point, b: Point, p: Point) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

export function interpolate(values: Weights, weights: Weights) {
  return values[0] * weights[0] + values[1] * weights[1] + values[2] * weights[2];
}

// Screen y increases downward. Include only the top/left member of a shared edge.
function ownsEdge(a: Point, b: Point) {
  return b.y < a.y || (b.y === a.y && b.x > a.x);
}

export function rasterize(
  triangle: Triangle,
  width: number,
  height: number,
  pixel: (x: number, y: number, weights: Weights) => void,
) {
  const [a, b, c] = triangle;
  const area = edge(a, b, c);
  if (Math.abs(area) < 1e-8) return;
  const sign = Math.sign(area);
  const inclusive = [[b, c], [c, a], [a, b]].map(([p, q]) =>
    sign > 0 ? ownsEdge(p, q) : ownsEdge(q, p));
  const minX = clamp(Math.floor(Math.min(a.x, b.x, c.x)), 0, width - 1);
  const maxX = clamp(Math.ceil(Math.max(a.x, b.x, c.x)), 0, width - 1);
  const minY = clamp(Math.floor(Math.min(a.y, b.y, c.y)), 0, height - 1);
  const maxY = clamp(Math.ceil(Math.max(a.y, b.y, c.y)), 0, height - 1);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const p = { x: x + 0.5, y: y + 0.5 };
      const edges = [edge(b, c, p), edge(c, a, p), edge(a, b, p)];
      if (edges.every((value, index) => value * sign > 0 || (value === 0 && inclusive[index]))) {
        pixel(x, y, [edges[0] / area, edges[1] / area, edges[2] / area]);
      }
    }
  }
}

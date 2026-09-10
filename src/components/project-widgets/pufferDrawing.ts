import type { Graph, Point } from '@/lib/puffer/hnsw';
import colors from './colors';

export interface Plot { left: number; top: number; width: number; height: number }
export function position(point: Point, plot: Plot) {
  return { x: plot.left + 14 + point.x * (plot.width - 28), y: plot.top + 32 + point.y * (plot.height - 48) };
}
export function comparisonPlots(width: number, height: number): Plot[] {
  return width < 520
    ? [0, 1].map(i => ({ left: 0, top: i * height / 2, width, height: height / 2 }))
    : [0, 1].map(i => ({ left: i * width / 2, top: 0, width: width / 2, height }));
}
export function cloud(context: CanvasRenderingContext2D, graph: Graph, plot: Plot, visited: ReadonlySet<number>, best: readonly number[], allowed?: ReadonlySet<number>) {
  graph.nodes.forEach((node, id) => {
    const p = position(node, plot);
    context.strokeStyle = visited.has(id) ? colors.foreground : colors.border;
    context.fillStyle = visited.has(id) ? colors.foreground : colors.border;
    context.beginPath();
    if (allowed && !allowed.has(id)) { context.moveTo(p.x - 2, p.y - 2); context.lineTo(p.x + 2, p.y + 2); context.stroke(); }
    else { context.arc(p.x, p.y, 2.5, 0, 2 * Math.PI); context.fill(); }
    if (best.includes(id)) {
      context.strokeStyle = colors.foreground;
      context.beginPath(); context.arc(p.x, p.y, 6, 0, 2 * Math.PI); context.stroke();
    }
  });
}
export function queryMark(context: CanvasRenderingContext2D, query: Point, plot: Plot) {
  const p = position(query, plot);
  context.strokeStyle = colors.foreground;
  context.lineWidth = 2;
  context.strokeRect(p.x - 5, p.y - 5, 10, 10);
  context.lineWidth = 1;
}

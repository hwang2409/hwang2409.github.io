'use client';

import { useCallback, useState } from 'react';
import { buildGraph, exactSearch, points, searchGraph } from '@/lib/puffer/hnsw';
import InteractiveCanvas from './InteractiveCanvas';
import { Slider, WidgetControls } from './WidgetControls';
import { clearCanvas } from './canvas';
import colors from './colors';
import styles from './PufferWidgets.module.css';

const breadths = [10, 16, 24, 32, 48, 64, 96, 128];
const measurements = (() => {
  const graph = buildGraph(points(480, 84), 2, 8);
  const queries = points(24, 238);
  return breadths.map(ef => {
    let hits = 0, visited = 0;
    for (const query of queries) {
      const truth = exactSearch(graph, query);
      const result = searchGraph(graph, query, ef);
      hits += result.best.filter(id => truth.includes(id)).length;
      visited += result.visited;
    }
    return { ef, recall: hits / (queries.length * 10), visited: visited / queries.length };
  });
})();
export default function RecallWidget() {
  const [index, setIndex] = useState(1);
  const selected = measurements[index];
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    clearCanvas(ctx, width, height);
    const left = 44, right = width - 44, top = 45, bottom = height - 40;
    const x = (ef: number) => left + (ef - 10) / 118 * (right - left);
    const y = (fraction: number) => bottom - fraction * (bottom - top);
    ctx.fillText('recall (solid)', 12, 20);
    ctx.textAlign = 'right'; ctx.fillText('visits (dashed)', width - 12, 20); ctx.textAlign = 'left';
    for (const f of [0, .5, 1]) {
      ctx.strokeStyle = colors.border;
      ctx.beginPath(); ctx.moveTo(left, y(f)); ctx.lineTo(right, y(f)); ctx.stroke();
      ctx.fillText(`${f * 100}%`, 2, y(f) + 4); ctx.fillText(String(f * 480), right + 5, y(f) + 4);
    }
    for (const metric of ['recall', 'visited'] as const) {
      ctx.strokeStyle = colors.foreground;
      ctx.setLineDash(metric === 'recall' ? [] : [5, 4]);
      ctx.beginPath();
      measurements.forEach((row, i) => {
        const value = metric === 'recall' ? row.recall : row.visited / 480;
        if (i === 0) ctx.moveTo(x(row.ef), y(value)); else ctx.lineTo(x(row.ef), y(value));
      });
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = colors.muted;
    ctx.beginPath(); ctx.moveTo(x(selected.ef), top); ctx.lineTo(x(selected.ef), bottom); ctx.stroke();
    ctx.fillText('10', left, bottom + 22);
    ctx.fillText('efSearch', width / 2 - 30, bottom + 22);
    ctx.fillText('128', right - 22, bottom + 22);
  }, [selected]);
  return <section className={`project-widget ${styles.scene}`} aria-label="recall versus search breadth">
    <InteractiveCanvas draw={draw} hint="wider beams trade more visits for better recall. both curves use actual searches." aria-label="recall and mean visited nodes plotted against efSearch" />
    <WidgetControls readout={{ children: `recall@10: ${(selected.recall * 100).toFixed(1)}% · mean visited: ${selected.visited.toFixed(1)}/480` }}
      note="24 fixed queries; 480 seeded 2d points; M=2, efConstruction=8. these browser results are separate from the Rust benchmarks.">
      <Slider label="efSearch" valueText={String(selected.ef)} min={0} max={breadths.length - 1} value={index} onChange={e => setIndex(Number(e.target.value))} />
    </WidgetControls>
    <details><summary>measured values</summary><table className={styles.chartTable}>
      <thead><tr><th>efSearch</th><th>recall@10</th><th>mean visited</th></tr></thead>
      <tbody>{measurements.map(row => <tr key={row.ef}><td>{row.ef}</td><td>{(row.recall * 100).toFixed(1)}%</td><td>{row.visited.toFixed(1)}</td></tr>)}</tbody>
    </table></details>
  </section>;
}

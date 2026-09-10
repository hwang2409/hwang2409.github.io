'use client';

import { useCallback, useMemo, useState } from 'react';
import { buildGraph, exactSearch, searchGraph } from '@/lib/puffer/hnsw';
import InteractiveCanvas from './InteractiveCanvas';
import { Slider, WidgetControls } from './WidgetControls';
import { clearCanvas } from './canvas';
import { cloud, comparisonPlots, position, queryMark } from './pufferDrawing';
import colors from './colors';
import styles from './PufferWidgets.module.css';

export default function VectorQueryWidget() {
  const [graph] = useState(() => buildGraph());
  const [query, setQuery] = useState({ x: .6, y: .45 });
  const [ef, setEf] = useState(16);
  const [replay, setReplay] = useState(0);
  const result = useMemo(() => searchGraph(graph, query, ef), [graph, query, ef]);
  const exact = useMemo(() => exactSearch(graph, query), [graph, query]);
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
    clearCanvas(ctx, width, height);
    const [left, right] = comparisonPlots(width, height);
    const progress = staticPreview ? 1 : Math.min(1, elapsed / 1800);
    const count = Math.floor(graph.nodes.length * progress);
    cloud(ctx, graph, left, new Set(graph.nodes.slice(0, count).map((_, id) => id)), progress === 1 ? exact : []);
    ctx.fillText(`exact: ${count} visited`, left.left + 12, left.top + 20);
    const visits = result.visits.slice(0, Math.ceil(result.visits.length * progress));
    ctx.strokeStyle = colors.border;
    for (const visit of visits) {
      const a = position(graph.nodes[visit.from], right), b = position(graph.nodes[visit.id], right);
      ctx.setLineDash(visit.layer > 0 ? [4, 3] : []);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    const seen = new Set(visits.map(v => v.id));
    cloud(ctx, graph, right, seen, progress === 1 ? result.best : []);
    ctx.fillText(`HNSW: ${seen.size} visited`, right.left + 12, right.top + 20);
    if (progress === 1) {
      ctx.strokeStyle = colors.muted;
      for (const id of result.beam) {
        const p = position(graph.nodes[id], right);
        ctx.strokeRect(p.x - 4, p.y - 4, 8, 8);
      }
    }
    queryMark(ctx, query, left); queryMark(ctx, query, right);
  }, [graph, query, exact, result]);
  return <section className={`project-widget ${styles.scene} ${styles.comparison}`} aria-label="exact versus HNSW query">
    <InteractiveCanvas draw={draw} resetKey={replay} className={styles.query}
      aria-label="move the query with a click or arrow keys" tabIndex={0}
      onPointerDown={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const plots = comparisonPlots(bounds.width, bounds.height);
        const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
        const plot = plots.find(p => x >= p.left && x <= p.left + p.width && y >= p.top && y <= p.top + p.height)!;
        setQuery({ x: Math.max(0, Math.min(1, (x - plot.left - 14) / (plot.width - 28))), y: Math.max(0, Math.min(1, (y - plot.top - 32) / (plot.height - 48))) });
      }}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const dx = event.key === 'ArrowRight' ? .04 : event.key === 'ArrowLeft' ? -.04 : 0;
        const dy = event.key === 'ArrowDown' ? .04 : event.key === 'ArrowUp' ? -.04 : 0;
        setQuery(q => ({ x: Math.max(0, Math.min(1, q.x + dx)), y: Math.max(0, Math.min(1, q.y + dy)) }));
      }} hint="click either plot or use arrow keys. rings: top 10; small squares: final beam; dashed edges: upper layers." />
    <WidgetControls label="search" actions={<button type="button" onClick={() => setReplay(n => n + 1)}>[replay]</button>}
      readout={{ children: `exact: 320 visited · HNSW: ${result.visited} visited, ${result.expansions} expansions · ${result.best.filter(id => exact.includes(id)).length}/10 exact neighbors` }}
      note="the sweep replays measured visits; animation duration is not query time. distances are euclidean in this 2d demo.">
      <Slider label="efSearch" valueText={String(ef)} min={10} max={100} value={ef} onChange={e => setEf(Number(e.target.value))} />
    </WidgetControls>
  </section>;
}

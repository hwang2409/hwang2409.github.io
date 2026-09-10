'use client';

import { useCallback, useMemo, useState } from 'react';
import { buildGraph, points } from '@/lib/puffer/hnsw';
import InteractiveCanvas from './InteractiveCanvas';
import { Slider, WidgetControls } from './WidgetControls';
import { clearCanvas } from './canvas';
import { position } from './pufferDrawing';
import colors from './colors';
import styles from './PufferWidgets.module.css';

const data = points(80);
export default function HnswBuildWidget() {
  const [count, setCount] = useState(12);
  const [m, setM] = useState(3);
  const [ef, setEf] = useState(12);
  const graph = useMemo(() => buildGraph(data.slice(0, count), m, ef), [count, m, ef]);
  const top = graph.nodes[graph.entry].level;
  const [layer, setLayer] = useState(0);
  const visibleLayer = Math.min(layer, top);
  const latest = graph.nodes[count - 1];
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    clearCanvas(ctx, width, height);
    const plot = { left: 0, top: 0, width, height };
    ctx.fillText(`layer ${visibleLayer} · ${graph.nodes.filter(n => n.level >= visibleLayer).length} nodes`, 12, 20);
    graph.nodes.forEach((node, id) => {
      if (node.level < visibleLayer) return;
      const p = position(node, plot);
      for (const neighbor of node.edges[visibleLayer]) {
        const end = position(graph.nodes[neighbor], plot);
        ctx.strokeStyle = id === count - 1 || neighbor === count - 1 ? colors.foreground : colors.border;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      }
    });
    graph.nodes.forEach((node, id) => {
      if (node.level < visibleLayer) return;
      const p = position(node, plot);
      ctx.fillStyle = colors.foreground;
      ctx.beginPath(); ctx.arc(p.x, p.y, id === count - 1 ? 6 : 3, 0, 2 * Math.PI); ctx.fill();
      if (id === count - 1) ctx.fillText(String(id + 1), Math.min(width - 25, p.x + 9), p.y);
    });
  }, [graph, count, visibleLayer]);
  return <section className={`project-widget ${styles.scene}`} aria-label="HNSW construction">
    <InteractiveCanvas draw={draw} hint="insert a point, then inspect its layers. bold edges touch the newest point." aria-label="HNSW neighbor graph at the selected layer" />
    <WidgetControls label="build" actions={<>
      <button type="button" disabled={count === data.length} onClick={() => setCount(n => n + 1)}>[insert point]</button>
      <button type="button" onClick={() => setCount(1)}>[reset]</button>
    </>} readout={{ children: `${count}/80 inserted · newest point level: ${latest.level} · highest layer: ${top}` }}
      note="levels use a seeded geometric distribution. each layer keeps nearest neighbors; layer 0 allows 2M and preserves insertion-order links. changing settings rebuilds the same prefix.">
      <Slider label="M" valueText={String(m)} min={2} max={8} value={m} onChange={e => setM(Number(e.target.value))} />
      <Slider label="efConstruction" valueText={String(ef)} min={2} max={64} value={ef} onChange={e => setEf(Number(e.target.value))} />
      <Slider label="view layer" valueText={String(visibleLayer)} min={0} max={Math.max(1, top)} value={visibleLayer} disabled={top === 0} onChange={e => setLayer(Number(e.target.value))} />
    </WidgetControls>
  </section>;
}

'use client';

import { useCallback, useMemo, useState } from 'react';
import { buildGraph, exactSearch, searchGraph } from '@/lib/puffer/hnsw';
import InteractiveCanvas from './InteractiveCanvas';
import { ControlField, Slider, WidgetControls } from './WidgetControls';
import { clearCanvas } from './canvas';
import { cloud, queryMark } from './pufferDrawing';
import styles from './PufferWidgets.module.css';

const query = { x: .58, y: .42 };
const tags = ['notes', 'code', 'papers'];
export default function HybridSearchWidget() {
  const [graph] = useState(() => buildGraph());
  const [tag, setTag] = useState(0);
  const [before, setBefore] = useState(true);
  const [ef, setEf] = useState(16);
  const allowed = useMemo(() => new Set(graph.nodes.flatMap((node, id) => node.tag === tag ? [id] : [])), [graph, tag]);
  const result = useMemo(() => searchGraph(graph, query, ef, 10, before ? allowed : undefined), [graph, ef, before, allowed]);
  const best = useMemo(() => result.best.filter(id => allowed.has(id)), [result, allowed]);
  const truth = useMemo(() => exactSearch(graph, query, 10, allowed), [graph, allowed]);
  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    clearCanvas(ctx, width, height);
    const plot = { left: 0, top: 0, width, height };
    cloud(ctx, graph, plot, new Set(result.visits.map(v => v.id)), best, allowed);
    queryMark(ctx, query, plot);
    ctx.fillText(`${tags[tag]}: ${allowed.size}/320 eligible`, 12, 20);
  }, [graph, tag, result, best, allowed]);
  return <section className={`project-widget ${styles.scene}`} aria-label="filtered vector search">
    <InteractiveCanvas draw={draw} hint="dots match the tag; slashes fail it. dark marks were visited; rings are returned results." aria-label="tagged point cloud with filtered nearest neighbors" />
    <WidgetControls label="filter" readout={{ children: `${best.length}/10 results · ${best.filter(id => truth.includes(id)).length}/10 exact filtered neighbors · ${result.visited} visited` }}
      note="filter-first keeps rejected nodes for routing but excludes them from the result beam. filter-last discards mismatches after the unfiltered top 10. sparse filters can still lose recall.">
      <ControlField label="tag"><select value={tag} onChange={e => setTag(Number(e.target.value))}>{tags.map((name, i) => <option value={i} key={name}>{name}</option>)}</select></ControlField>
      <ControlField label="filter before search"><input type="checkbox" checked={before} onChange={e => setBefore(e.target.checked)} /></ControlField>
      <Slider label="efSearch" valueText={String(ef)} min={10} max={80} value={ef} onChange={e => setEf(Number(e.target.value))} />
    </WidgetControls>
  </section>;
}

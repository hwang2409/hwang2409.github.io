'use client';

import { useMemo, useState } from 'react';
import { scoreDocuments } from '@/lib/puffer/bm25';
import { ControlField, Slider, WidgetControls } from './WidgetControls';
import styles from './PufferWidgets.module.css';

export default function Bm25Widget() {
  const [query, setQuery] = useState('rust search');
  const [k1, setK1] = useState(1.2);
  const [b, setB] = useState(.75);
  const rows = useMemo(() => scoreDocuments(query, k1, b), [query, k1, b]);
  return <section className="project-widget" aria-label="BM25 scoring">
    <WidgetControls label="query" note="tf: term count; idf: rarity across all six documents. scores sum the per-term contributions. zero scores do not match.">
      <ControlField label="search text"><input type="search" value={query} maxLength={120} onChange={e => setQuery(e.target.value)} /></ControlField>
      <Slider label="k1 · saturation" valueText={k1.toFixed(1)} min={0} max={3} step={.1} value={k1} onChange={e => setK1(Number(e.target.value))} />
      <Slider label="b · length penalty" valueText={b.toFixed(2)} min={0} max={1} step={.05} value={b} onChange={e => setB(Number(e.target.value))} />
    </WidgetControls>
    <ol className={styles.results} aria-label="ranked sample documents">
      {rows.map(row => <li key={row.id}>
        <div>{row.text}</div>
        <div className={styles.terms}>score {row.score.toFixed(3)} · {row.length} tokens</div>
        <div className={styles.terms}>{row.contributions.length ? row.contributions.map((term, i) => <span key={i}>
          {i > 0 ? ' + ' : ''}{term.term}: tf {term.tf} × idf {term.idf.toFixed(3)} → {term.score.toFixed(3)}
        </span>) : 'enter a query to calculate contributions'}</div>
      </li>)}
    </ol>
    <p className="project-widget-note">the controls explore the formula. pufferclone fixes k1=1.2 and b=0.75; it does not expose these sliders.</p>
  </section>;
}

'use client';

import { useMemo, useState } from 'react';
import { renderDepth } from '@/lib/raster/depth';
import InteractiveCanvas from './InteractiveCanvas';
import { ControlGroup } from './WidgetControls';
import { clearCanvas } from './canvas';
import { rasterPainter } from './rasterCanvas';
import styles from './RasterWidgets.module.css';

export default function ZBufferWidget() {
  const [depthTest, setDepthTest] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [revision, setRevision] = useState(0);
  const paint = useMemo(() => rasterPainter(renderDepth(depthTest, reverse)), [depthTest, reverse]);

  return (
    <section className={`project-widget ${styles.widget}`} aria-label="painter's algorithm and per-pixel depth">
      <InteractiveCanvas hint="choose a depth method · swap draw order to test the overlap" aria-label={depthTest ? 'depth test: the dark triangle is in front on the left, the light triangle on the right' : 'painter mode: the last triangle covers the entire overlap incorrectly'}
        resetKey={revision}
        draw={(context, width, height) => {
          clearCanvas(context, width, height);
          const scale = Math.min((width - 24) / 240, (height - 64) / 180);
          paint(context, (width - 240 * scale) / 2, 30, 240 * scale, 180 * scale);
          context.fillText(depthTest ? 'nearest fragment wins' : 'last triangle wins', 12, 20);
        }} />
      <div className="project-widget-controls">
        <ControlGroup label="draw order">
          <button type="button" onClick={() => { setReverse((v) => !v); setRevision((v) => v + 1); }}>[swap order]</button>
        </ControlGroup>
        <ControlGroup label="depth method">
          <button type="button" aria-pressed={!depthTest} onClick={() => { setDepthTest(false); setRevision((v) => v + 1); }}>[painter]</button>
          <button type="button" aria-pressed={depthTest} onClick={() => { setDepthTest(true); setRevision((v) => v + 1); }}>[z-buffer]</button>
        </ControlGroup>
      </div>
      <div className="project-widget-readout"><output>{reverse ? 'dark drawn last' : 'light drawn last'}</output></div>
      <p className="project-widget-note">the triangles cross in depth. swap their order: painter mode changes; the z-buffer result stays the same.</p>
    </section>
  );
}

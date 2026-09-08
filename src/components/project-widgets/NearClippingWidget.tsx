'use client';

import { useMemo, useState } from 'react';
import { renderNearClipping } from '@/lib/raster/nearClipping';
import InteractiveCanvas from './InteractiveCanvas';
import { ControlGroup, Slider } from './WidgetControls';
import { clearCanvas } from './canvas';
import colors from './colors';
import { rasterPainter } from './rasterCanvas';
import styles from './RasterWidgets.module.css';

export default function NearClippingWidget() {
  const [dolly, setDolly] = useState(0.7);
  const [clipping, setClipping] = useState(true);
  const [revision, setRevision] = useState(0);
  const result = useMemo(() => renderNearClipping(dolly, clipping), [dolly, clipping]);
  const paint = useMemo(() => rasterPainter(result.frame), [result]);
  const draw = useMemo(() => (context: CanvasRenderingContext2D, width: number, height: number) => {
    clearCanvas(context, width, height);
    const stacked = width < 520, panelWidth = stacked ? width : width / 2;
    const panelHeight = stacked ? height / 2 : height;
    const size = Math.min(panelWidth - 24, panelHeight - 48);
    const left = (panelWidth - size) / 2, top = 34 + (panelHeight - 48 - size) / 2;
    const mapX = (x: number) => left + size * (x + 1.6) / 3.2;
    // World positions stay fixed while the camera and near plane move forward.
    const mapZ = (viewZ: number) => top + size * (viewZ - dolly + 6) / 7.5;
    const polygon = (vertices: Float64Array, count: number) => {
      context.beginPath();
      for (let i = 0; i < count; i += 1) {
        const x = mapX(vertices[i * 3]), y = mapZ(vertices[i * 3 + 2]);
        if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.closePath();
    };
    context.textAlign = 'center';
    context.fillText('top down · x / z', panelWidth / 2, 22);
    context.save();
    context.beginPath(); context.rect(left, top, size, size); context.clip();
    context.setLineDash([4, 4]);
    polygon(result.input, 3); context.strokeStyle = colors.muted; context.stroke();
    context.setLineDash([]);
    if (result.count >= 3) {
      polygon(result.output, result.count);
      context.fillStyle = colors.code; context.fill();
      context.strokeStyle = colors.foreground; context.stroke();
      if (result.count === 4) {
        context.beginPath(); context.moveTo(mapX(result.output[0]), mapZ(result.output[2]));
        context.lineTo(mapX(result.output[6]), mapZ(result.output[8])); context.stroke();
      }
    }
    const nearY = mapZ(-result.near), cameraY = mapZ(0);
    context.strokeStyle = colors.foreground;
    context.beginPath(); context.moveTo(left, nearY); context.lineTo(left + size, nearY); context.stroke();
    context.fillStyle = colors.foreground;
    context.textAlign = 'left'; context.fillText('near', left + 3, nearY - 5);
    context.fillRect(mapX(0) - 3, cameraY - 3, 6, 6);
    context.fillText('camera', mapX(0) + 8, cameraY + 4);
    context.restore();
    const renderX = stacked ? left : panelWidth + left, renderY = stacked ? panelHeight + top : top;
    paint(context, renderX, renderY, size, size);
    context.textAlign = 'center'; context.fillStyle = colors.foreground;
    context.fillText('rendered view', stacked ? width / 2 : panelWidth * 1.5, stacked ? panelHeight + 22 : 22);
  }, [result, paint, dolly]);

  return <section className={`project-widget ${styles.widget}`} aria-label="near-plane triangle clipping">
    <InteractiveCanvas hint="toggle clipping · move the camera past the near plane" draw={draw} resetKey={revision} className={styles.splitCanvas}
      aria-label="top-down camera diagram and software-rendered output of the same triangle crossing the near plane" />
    <div className="project-widget-controls">
      <ControlGroup label="camera" actions={<>
        <button type="button" aria-pressed={clipping} onClick={() => setClipping(!clipping)}>[clipping {clipping ? 'on' : 'off'}]</button>
        <button type="button" onClick={() => { setDolly(0.7); setClipping(true); setRevision((v) => v + 1); }}>[reset]</button>
      </>}>
        <Slider label="camera dolly" valueText={`${dolly.toFixed(2)} units`} min={-0.5} max={4.5} step={0.05} value={dolly} onChange={(e) => setDolly(e.currentTarget.valueAsNumber)} />
      </ControlGroup>
    </div>
    <p className="project-widget-readout">{result.count} vertices → {Math.max(0, result.count - 2)} triangles{result.singular ? ' · projection undefined at the camera plane' : ''}</p>
    <p className="project-widget-note">dashed edges show the input; solid edges show the output and its triangle split. turn clipping off, then dolly past 1.13 to see the projection flip.</p>
  </section>;
}

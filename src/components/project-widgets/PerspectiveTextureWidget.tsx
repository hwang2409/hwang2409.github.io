'use client';

import { useMemo, useState } from 'react';
import { clamp } from '@/lib/raster/triangle';
import { renderChecker } from '@/lib/raster/perspective';
import InteractiveCanvas from './InteractiveCanvas';
import { WidgetControls, Slider } from './WidgetControls';
import colors from './colors';
import { clearCanvas } from './canvas';
import { rasterPainter } from './rasterCanvas';
import styles from './RasterWidgets.module.css';

export default function PerspectiveTextureWidget() {
  const [tilt, setTilt] = useState(52);
  const [revision, setRevision] = useState(0);
  const affine = useMemo(() => rasterPainter(renderChecker(tilt, false)), [tilt]);
  const correct = useMemo(() => rasterPainter(renderChecker(tilt, true)), [tilt]);

  return (
    <section className={`project-widget ${styles.widget}`} aria-label="affine and perspective-correct texture mapping">
      <InteractiveCanvas hint="tilt the checkerboard" aria-label="the same tilted checkerboard: affine interpolation on the left, perspective-correct interpolation on the right"
        resetKey={revision}
        draw={(context, width, height) => {
          clearCanvas(context, width, height);
          const half = width / 2;
          const scale = Math.min((half - 12) / 180, (height - 66) / 210);
          const top = 34 + (height - 66 - 210 * scale) / 2;
          affine(context, (half - 180 * scale) / 2, top, 180 * scale, 210 * scale);
          correct(context, half + (half - 180 * scale) / 2, top, 180 * scale, 210 * scale);
          context.textAlign = 'center';
          context.fillText('affine', half / 2, 22);
          context.fillText('1/w corrected', half * 1.5, 22);
          context.strokeStyle = colors.border;
          context.beginPath();
          context.moveTo(Math.floor(half) + 0.5, 36);
          context.lineTo(Math.floor(half) + 0.5, height - 34);
          context.stroke();
        }} />
      <WidgetControls
        note="at 0° both methods agree.">
        <Slider label="tilt" valueText={`${tilt}°`} min={0} max={72} step={1} value={tilt}
          onChange={(event) => {
            setTilt(clamp(event.currentTarget.valueAsNumber, 0, 72));
            setRevision((v) => v + 1);
          }} />
      </WidgetControls>
    </section>
  );
}

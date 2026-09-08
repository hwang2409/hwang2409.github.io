'use client';

import { useMemo, useRef, useState } from 'react';
import { MipmapFloor } from '@/lib/raster/mipmapFloor';
import InteractiveCanvas from './InteractiveCanvas';
import { WidgetControls, PauseButton, ControlGroup } from './WidgetControls';
import { clearCanvas } from './canvas';
import styles from './RasterWidgets.module.css';

export default function MipmapWidget() {
  const [mipmaps, setMipmaps] = useState(true);
  const [falseColor, setFalseColor] = useState(false);
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);
  const floor = useMemo(() => new MipmapFloor(), []);
  const travel = useRef(0);
  // Keep the upload buffer across control changes as well as animation frames.
  const paint = useMemo(() => {
    let surface: HTMLCanvasElement | undefined;
    let upload: CanvasRenderingContext2D | null = null;
    let image: ImageData | undefined;
    return (context: CanvasRenderingContext2D, width: number, height: number, changed: boolean) => {
      if (!surface) {
        surface = document.createElement('canvas');
        surface.width = floor.frame.width; surface.height = floor.frame.height;
        upload = surface.getContext('2d');
        image = upload?.createImageData(surface.width, surface.height);
        changed = true;
      }
      if (!image || !upload) return;
      if (changed) { image.data.set(floor.frame.pixels); upload.putImageData(image, 0, 0); }
      const w = Math.min(width, height * 1.5);
      context.imageSmoothingEnabled = false;
      context.drawImage(surface, (width - w) / 2, (height - w / 1.5) / 2, w, w / 1.5);
    };
  }, [floor]);
  const draw = useMemo(() => {
    let previous = 0, renderedTravel = NaN;
    return (context: CanvasRenderingContext2D, width: number, height: number, elapsed: number, staticPreview: boolean) => {
      const delta = Math.min(350, Math.max(0, elapsed - previous));
      previous = elapsed;
      if (!paused && !staticPreview) travel.current = (travel.current + delta * 0.0004) % 2;
      const changed = renderedTravel !== travel.current;
      if (changed) { floor.render(travel.current, mipmaps, falseColor); renderedTravel = travel.current; }
      clearCanvas(context, width, height);
      paint(context, width, height, changed);
    };
  }, [floor, paint, mipmaps, falseColor, paused]);

  return <section className={`project-widget ${styles.widget}`} aria-label="mipmap levels on a receding floor">
    <InteractiveCanvas hint="toggle mipmaps · show levels or pause to inspect distant checks" draw={draw} resetKey={revision}
      aria-label={falseColor ? 'mip levels shown as grayscale bands: level zero is dark, level six is light'
        : 'a moving checkered floor, with distant texture samples compared using mipmaps on or off'} />
    <WidgetControls
      note={falseColor
      ? 'level 0 is dark; level 6 is light. bands show the lower mip of each trilinear blend. mipmaps off uses level 0 everywhere.'
      : 'turn mipmaps off to see distant checks shimmer. both modes use bilinear sampling; mipmaps also average the smaller details.'}>
      <ControlGroup label="texture">
        <button type="button" aria-pressed={mipmaps} onClick={() => { setMipmaps(!mipmaps); setRevision((v) => v + 1); }}>[mipmaps {mipmaps ? 'on' : 'off'}]</button>
        <button type="button" aria-pressed={falseColor} onClick={() => { setFalseColor(!falseColor); setRevision((v) => v + 1); }}>[false-color levels]</button>
      </ControlGroup>
      <ControlGroup label="playback">
        <PauseButton paused={paused} onClick={() => { setPaused(!paused); setRevision((v) => v + 1); }} />
        <button type="button" onClick={() => {
          setMipmaps(true); setFalseColor(false); setPaused(false); travel.current = 0; setRevision((v) => v + 1);
        }}>[reset]</button>
      </ControlGroup>
    </WidgetControls>
  </section>;
}

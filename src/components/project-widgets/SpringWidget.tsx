'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import InteractiveCanvas from './InteractiveCanvas';
import { WidgetControls, ControlGroup, Slider } from './WidgetControls';
import colors from './colors';
import { clearCanvas, crisp } from './canvas';
import { dampingForSlider, sampleSpring, simulateSpring } from '@/lib/physics/spring';

const duration = 4;

function drawSpring(context: CanvasRenderingContext2D, centerX: number, top: number, bottom: number) {
  const turns = 10;
  const length = bottom - top;
  context.strokeStyle = colors.foreground;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(centerX, top);
  for (let index = 0; index <= turns * 2; index += 1) {
    const y = top + (index / (turns * 2)) * length;
    const x = centerX + (index === 0 || index === turns * 2 ? 0 : (index % 2 === 0 ? -12 : 12));
    context.lineTo(x, y);
  }
  context.stroke();
}

function drawTrace(context: CanvasRenderingContext2D, trace: { time: number; displacement: number }[], width: number, height: number, elapsed: number) {
  const startX = 22;
  const traceWidth = width - 44;
  const centerY = height - 52;
  const scale = 34 / Math.max(...trace.map(p => Math.abs(p.displacement)), 0.01);
  context.strokeStyle = colors.border;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(startX, crisp(centerY));
  context.lineTo(startX + traceWidth, crisp(centerY));
  context.stroke();
  context.strokeStyle = colors.muted;
  context.beginPath();
  trace.forEach((point, index) => {
    const x = startX + (point.time / duration) * traceWidth;
    const y = centerY - point.displacement * scale;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  const time = (elapsed / 1000) % duration;
  const currentX = startX + (time / duration) * traceWidth;
  const currentY = centerY - sampleSpring(trace, time) * scale;
  context.fillStyle = colors.foreground;
  context.beginPath();
  context.arc(currentX, currentY, 3, 0, Math.PI * 2);
  context.fill();
}

export default function SpringWidget() {
  const [dampingValue, setDampingValue] = useState(40);
  const [displacement, setDisplacement] = useState(0.8);
  const [replayKey, setReplayKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const damping = dampingForSlider(dampingValue);
  const trace = useMemo(() => simulateSpring(displacement, damping, duration), [displacement, damping]);

  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, elapsed: number) => {
    clearCanvas(context, width, height);
    const centerX = width / 2;
    const restY = 125;
    const elapsedDisplacement = sampleSpring(trace, (elapsed / 1000) % duration);
    const massY = restY + (isDragging ? displacement : elapsedDisplacement) * 55;
    context.fillStyle = colors.foreground;
    context.fillRect(centerX - 4, 24, 8, 4);
    drawSpring(context, centerX, 30, massY - 13);
    context.strokeStyle = colors.border;
    context.beginPath();
    context.moveTo(centerX - 34, crisp(restY));
    context.lineTo(centerX + 34, crisp(restY));
    context.stroke();
    context.fillStyle = colors.foreground;
    context.fillRect(centerX - 13, massY - 13, 26, 26);
    drawTrace(context, trace, width, height, elapsed);
  }, [displacement, isDragging, trace]);

  const updateDisplacement = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const restY = 125;
    const next = (event.clientY - bounds.top - restY) / 55;
    setDisplacement(Math.max(-0.9, Math.min(1.4, next)));
  };

  return (
    <section className="project-widget" aria-label="spring and damping">
      <InteractiveCanvas hint="pull the mass, then release"
        className="project-widget-draggable"
        aria-label="draggable mass on a spring with a motion trace"
        draw={draw}
        resetKey={replayKey}
        onPointerDown={(event) => {
          dragging.current = true;
          setIsDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          updateDisplacement(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) updateDisplacement(event);
        }}
        onPointerUp={(event) => {
          dragging.current = false;
          setIsDragging(false);
          setReplayKey((value) => value + 1);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragging.current = false;
          setIsDragging(false);
          setReplayKey((value) => value + 1);
        }}
      />
      <WidgetControls>
        <ControlGroup>
          <Slider label="displacement" valueText={`${displacement.toFixed(2)}`} id="spring-displacement" min="-0.9" max="1.4" step="0.01" value={displacement}
            onChange={(event) => {
              setDisplacement(Number(event.target.value));
              setReplayKey((value) => value + 1);
            }} />
          <Slider label="damping" valueText={`${damping.toFixed(1)}`} id="spring-damping" min="0" max="100" step="1" value={dampingValue}
            onChange={(event) => { setDampingValue(Number(event.target.value)); setReplayKey(value => value + 1); }} />
        </ControlGroup>
      </WidgetControls>
    </section>
  );
}

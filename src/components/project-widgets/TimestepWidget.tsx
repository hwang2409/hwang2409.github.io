'use client';

import { useCallback, useMemo, useState } from 'react';
import InteractiveCanvas from './InteractiveCanvas';
import colors from './colors';
import { clearCanvas, crisp } from './canvas';
import { sampleTrace, simulateFixedTrace, simulateVariableTrace, type BouncePoint } from '@/lib/physics/timestep';

const duration = 3;

function drawTrace(
  context: CanvasRenderingContext2D,
  trace: BouncePoint[],
  startX: number,
  width: number,
  height: number,
  color: string,
  maxHeight: number,
  dash: number[] = [],
) {
  const floor = height - 30;
  context.strokeStyle = color;
  context.lineWidth = color === colors.foreground ? 2 : 1;
  context.setLineDash(dash);
  context.beginPath();
  trace.forEach((point, index) => {
    const x = startX + (point.time / duration) * width;
    const y = floor - (point.height / maxHeight) * (height - 72);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.setLineDash([]);
}

function drawPanel(
  context: CanvasRenderingContext2D,
  trace: BouncePoint[],
  ghost: BouncePoint[],
  startX: number,
  width: number,
  height: number,
  elapsed: number,
  title: string,
  traceColor: string,
  maxHeight: number,
) {
  const floor = height - 30;
  context.fillStyle = colors.foreground;
  context.fillText(title, startX, 22);
  context.strokeStyle = colors.border;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(startX, crisp(floor));
  context.lineTo(startX + width, crisp(floor));
  context.stroke();
  drawTrace(context, ghost, startX, width, height, colors.border, maxHeight, [4, 4]);
  drawTrace(context, trace, startX, width, height, traceColor, maxHeight);

  const time = (elapsed / 1000) % duration;
  const heightAtTime = sampleTrace(trace, time);
  const ballX = startX + (time / duration) * width;
  const ballY = floor - (heightAtTime / maxHeight) * (height - 72);
  context.fillStyle = traceColor;
  context.beginPath();
  context.arc(ballX, ballY, 5, 0, Math.PI * 2);
  context.fill();
}

export default function TimestepWidget() {
  const [jitter, setJitter] = useState(0.45);
  const [seed, setSeed] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const fixedTrace = useMemo(() => simulateFixedTrace(jitter, seed, duration), [jitter, seed]);
  const variableTrace = useMemo(() => simulateVariableTrace(jitter, seed, duration), [jitter, seed]);
  const [ghost, setGhost] = useState({ fixed: fixedTrace, variable: variableTrace });

  const maxHeight = useMemo(() => Math.max(...[fixedTrace, variableTrace, ghost.fixed, ghost.variable].flat().map(p => p.height)), [fixedTrace, variableTrace, ghost]);

  const draw = useCallback((context: CanvasRenderingContext2D, width: number, height: number, elapsed: number) => {
    clearCanvas(context, width, height);
    const gap = 22;
    const inset = 12;
    const panelWidth = Math.max(1, (width - gap - 2 * inset) / 2);
    drawPanel(context, fixedTrace, ghost.fixed, inset, panelWidth, height, elapsed, 'fixed dt', colors.foreground, maxHeight);
    drawPanel(context, variableTrace, ghost.variable, inset + panelWidth + gap, panelWidth, height, elapsed, 'frame dt', colors.muted, maxHeight);
  }, [fixedTrace, ghost, variableTrace, maxHeight]);

  const replay = () => {
    setGhost({ fixed: fixedTrace, variable: variableTrace });
    setSeed((value) => value + 1);
    setReplayKey((value) => value + 1);
  };

  return (
    <section className="project-widget" aria-label="fixed and variable timestep comparison">
      <InteractiveCanvas aria-label="bouncing ball with fixed and variable timestep traces" draw={draw} resetKey={replayKey} />
      <div className="project-widget-legend" aria-label="timestep legend">
        <span><i className="legend-swatch legend-solid" />current run</span>
        <span><i className="legend-swatch legend-dashed" />previous run</span>
      </div>
      <div className="project-widget-controls project-widget-slider">
        <label htmlFor="frame-jitter">frame jitter: {Math.round(jitter * 100)}%</label>
        <input
          id="frame-jitter"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={jitter}
          onChange={(event) => { setJitter(Number(event.target.value)); setReplayKey(value => value + 1); }}
        />
        <button type="button" onClick={replay}>[replay]</button>
      </div>
    </section>
  );
}

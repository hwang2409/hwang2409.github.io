'use client';

import type { CanvasHTMLAttributes, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type DrawCanvas = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
) => void;

type InteractiveCanvasProps = Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'children'> & {
  draw: DrawCanvas;
  resetKey?: number;
  children?: ReactNode;
};

export default function InteractiveCanvas({
  draw,
  resetKey = 0,
  children,
  className,
  ...canvasProps
}: InteractiveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionStep, setMotionStep] = useState({ resetKey, count: 0 });
  const step = motionStep.resetKey === resetKey ? motionStep.count : 0;
  drawRef.current = draw;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => setReducedMotion(mediaQuery.matches);
    updateReducedMotion();
    mediaQuery.addEventListener('change', updateReducedMotion);

    return () => mediaQuery.removeEventListener('change', updateReducedMotion);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 0;
    let height = 0;
    let visible = true;
    let frame = 0;
    let elapsed = 0;
    let start = performance.now();
    const staticMotion = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = (elapsed: number) => {
      if (width > 0 && height > 0) drawRef.current(context, width, height, elapsed);
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(staticMotion ? step * 350 : elapsed);
    };

    const tick = (now: number) => {
      if (!visible || staticMotion) return;
      elapsed = Math.max(0, now - start);
      render(elapsed);
      frame = window.requestAnimationFrame(tick);
    };

    const startAnimation = () => {
      if (staticMotion || !visible) return;
      start = performance.now() - elapsed;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(tick);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startAnimation();
      else window.cancelAnimationFrame(frame);
    });
    intersectionObserver.observe(canvas);
    startAnimation();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [reducedMotion, resetKey, step]);

  return (
    <div className="project-widget-canvas-wrap">
      <canvas ref={canvasRef} className={className} {...canvasProps} />
      {reducedMotion ? (
        <button className="project-widget-step" type="button" onClick={() => setMotionStep({ resetKey, count: step + 1 })}>
          [step]
        </button>
      ) : null}
      {children}
    </div>
  );
}

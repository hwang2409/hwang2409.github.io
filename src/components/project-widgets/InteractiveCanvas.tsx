'use client';

import type { CanvasHTMLAttributes, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { canvasFont } from './canvas';

type DrawCanvas = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  staticPreview: boolean,
) => void;

type InteractiveCanvasProps = Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'children'> & {
  draw: DrawCanvas;
  hint: string;
  resetKey?: number;
  redrawKey?: number;
  staticElapsed?: number;
  children?: ReactNode;
};

export default function InteractiveCanvas({
  draw,
  hint,
  resetKey = 0,
  redrawKey = 0,
  staticElapsed = 0,
  children,
  className,
  ...canvasProps
}: InteractiveCanvasProps) {
  const hintId = useId();
  const redrawRef = useRef<(() => void) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionStep, setMotionStep] = useState({ resetKey, count: 0 });
  const step = motionStep.resetKey === resetKey ? motionStep.count : 0;

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

    let disposed = false;
    let fontReady = false;
    let font = '';
    let width = 0;
    let height = 0;
    let visible = true;
    let frame = 0;
    let elapsed = 0;
    let start = performance.now();
    const staticMotion = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = (elapsed: number) => {
      if (!fontReady || width <= 0 || height <= 0) return;
      context.save();
      context.font = font;
      draw(context, width, height, Math.max(0, elapsed), staticMotion && step === 0);
      context.restore();
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(staticMotion ? (step === 0 ? staticElapsed : step * 350) : elapsed);
    };

    redrawRef.current = () => render(staticMotion ? (step === 0 ? staticElapsed : step * 350) : elapsed);

    const tick = (now: number) => {
      if (!visible || document.hidden || staticMotion) return;
      elapsed = Math.max(0, now - start);
      render(elapsed);
      frame = window.requestAnimationFrame(tick);
    };

    const startAnimation = () => {
      window.cancelAnimationFrame(frame);
      if (!fontReady || staticMotion || !visible || document.hidden) return;
      start = performance.now() - elapsed;
      frame = window.requestAnimationFrame(tick);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      startAnimation();
    });
    intersectionObserver.observe(canvas);
    document.addEventListener('visibilitychange', startAnimation);
    // Load the actual inherited family before any labeled frame, including resize.
    const prepareFont = async () => {
      font = canvasFont(canvas);
      await document.fonts.load(font);
      await document.fonts.ready;
      if (disposed) return;
      fontReady = true;
      resize();
      startAnimation();
    };
    void prepareFont();

    return () => {
      disposed = true;
      redrawRef.current = null;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', startAnimation);
    };
  }, [reducedMotion, resetKey, step, staticElapsed, draw]);

  useEffect(() => { redrawRef.current?.(); }, [redrawKey]);

  return (
    <>
      <div className="project-widget-canvas-wrap">
        <canvas ref={canvasRef} className={className} aria-describedby={hintId} {...canvasProps} />
        {reducedMotion ? (
          <button className="project-widget-step" type="button" onClick={() => setMotionStep({ resetKey, count: step + 1 })}>
            [step]
          </button>
        ) : null}
        {children}
      </div>
      <p className="project-widget-hint" id={hintId}>{hint}</p>
    </>
  );
}

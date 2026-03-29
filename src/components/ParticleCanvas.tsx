'use client';

import { useEffect, useRef } from 'react';

// 2D simplex noise
function createNoise() {
  const perm = new Uint8Array(512);
  const grad = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;

  return function (x: number, y: number): number {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; const g = grad[perm[ii + perm[jj]] % 8]; n0 = t0 * t0 * (g[0] * x0 + g[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; const g = grad[perm[ii + i1 + perm[jj + j1]] % 8]; n1 = t1 * t1 * (g[0] * x1 + g[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; const g = grad[perm[ii + 1 + perm[jj + 1]] % 8]; n2 = t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * (n0 + n1 + n2);
  };
}

const TRAIL_CAP = 30;

interface StreamParticle {
  trail: Float32Array; // [x0,y0, x1,y1, ...] ring buffer
  head: number;
  len: number;
  age: number;
  maxAge: number;
  speed: number;
  burst: boolean;
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const noise = createNoise();
    let animationId = 0;
    let particles: StreamParticle[] = [];
    let time = 0;
    let w = window.innerWidth;
    let h = window.innerHeight;
    let mouseX = -1000;
    let mouseY = -1000;
    let mouseStrength = 0;
    const TARGET_FPS = 30; // Cap at 30fps — smooth enough, half the CPU
    let lastFrame = 0;
    const frameInterval = 1000 / TARGET_FPS;

    const FIELD_SCALE = 0.002;
    const TIME_SPEED = 0.0006; // doubled since we run at half fps

    function spawn(): StreamParticle {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const trail = new Float32Array(TRAIL_CAP * 2);
      trail[0] = x;
      trail[1] = y;
      const burst = Math.random() < 0.05;
      return {
        trail, head: 0, len: 1, age: 0,
        maxAge: burst ? 80 + Math.random() * 60 : 50 + Math.random() * 70,
        speed: burst ? 1.6 + Math.random() * 0.6 : 0.7 + Math.random() * 0.6,
        burst,
      };
    }

    function resetParticle(p: StreamParticle) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      p.trail[0] = x; p.trail[1] = y;
      p.head = 0; p.len = 1; p.age = 0;
      p.burst = Math.random() < 0.05;
      p.maxAge = p.burst ? 80 + Math.random() * 60 : 50 + Math.random() * 70;
      p.speed = p.burst ? 1.6 + Math.random() * 0.6 : 0.7 + Math.random() * 0.6;
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    }

    function initParticles() {
      const area = w * h;
      // Fewer particles — 150-400 range
      const count = Math.max(150, Math.min(400, Math.floor(area / 5000)));
      particles = Array.from({ length: count }, spawn);
      for (const p of particles) p.age = Math.random() * p.maxAge * 0.5;
    }

    function handleMouseMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseStrength = 1;
    }

    function handleMouseLeave() { /* decay in draw loop */ }

    function tick() {
      animationId = requestAnimationFrame(tick);

      // Throttle to target fps
      const now = performance.now();
      if (now - lastFrame < frameInterval) return;
      lastFrame = now;

      time += TIME_SPEED;
      mouseStrength *= 0.97;

      ctx!.clearRect(0, 0, w, h);

      // Batch trails by opacity band to reduce state changes
      // Instead of per-segment stroke, build paths per alpha bucket
      const BANDS = 5;
      const paths: Path2D[] = [];
      const bandAlphas: number[] = [];
      const bandWidths: number[] = [];
      for (let b = 0; b < BANDS; b++) {
        paths.push(new Path2D());
        bandAlphas.push(0);
        bandWidths.push(0);
      }

      for (const p of particles) {
        const hx = p.trail[p.head * 2];
        const hy = p.trail[p.head * 2 + 1];

        // Single noise octave (saves ~40% CPU vs two)
        const angle = noise(hx * FIELD_SCALE, hy * FIELD_SCALE + time) * Math.PI * 2.5;
        let vx = Math.cos(angle);
        let vy = Math.sin(angle);

        // Mouse vortex
        if (mouseStrength > 0.02) {
          const dx = hx - mouseX;
          const dy = hy - mouseY;
          const distSq = dx * dx + dy * dy;
          const radius = 200;
          if (distSq < radius * radius && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const s = (1 - dist / radius) * mouseStrength * 2;
            vx += (-dy / dist) * s;
            vy += (dx / dist) * s;
          }
        }

        const nx = hx + vx * p.speed * 1.5;
        const ny = hy + vy * p.speed * 1.5;

        const newHead = (p.head + 1) % TRAIL_CAP;
        p.trail[newHead * 2] = nx;
        p.trail[newHead * 2 + 1] = ny;
        p.head = newHead;
        p.len = Math.min(p.len + 1, TRAIL_CAP);
        p.age++;

        if (p.age > p.maxAge || nx < -20 || nx > w + 20 || ny < -20 || ny > h + 20) {
          resetParticle(p);
          continue;
        }

        if (p.len < 3) continue;

        const lifeFrac = p.age / p.maxAge;
        const globalFade = Math.min(1, p.age / 8) * Math.max(0, 1 - Math.max(0, lifeFrac - 0.75) / 0.25);
        if (globalFade < 0.01) continue;

        // Draw trail as a single polyline per particle, split into a few opacity bands
        const maxAlpha = p.burst ? 0.25 : 0.12;
        for (let s = 0; s < p.len - 1; s++) {
          const tailIdx = (p.head - p.len + 1 + s + TRAIL_CAP) % TRAIL_CAP;
          const nextIdx = (tailIdx + 1) % TRAIL_CAP;

          const x0 = p.trail[tailIdx * 2];
          const y0 = p.trail[tailIdx * 2 + 1];
          const x1 = p.trail[nextIdx * 2];
          const y1 = p.trail[nextIdx * 2 + 1];

          const bandIdx = Math.min(BANDS - 1, Math.floor((s / (p.len - 1)) * BANDS));
          const t = s / (p.len - 1);
          const segAlpha = t * t * maxAlpha * globalFade;

          if (segAlpha < 0.005) continue;

          // Accumulate into band path
          paths[bandIdx].moveTo(x0, y0);
          paths[bandIdx].lineTo(x1, y1);

          // Track max alpha/width for this band
          bandAlphas[bandIdx] = Math.max(bandAlphas[bandIdx], segAlpha);
          bandWidths[bandIdx] = Math.max(bandWidths[bandIdx], (0.3 + t * 0.7) * (p.burst ? 1.6 : 0.9));
        }
      }

      // Draw all bands — only 5 stroke calls total instead of thousands
      ctx!.lineCap = 'round';
      for (let b = 0; b < BANDS; b++) {
        if (bandAlphas[b] < 0.005) continue;
        ctx!.strokeStyle = `rgba(200,205,210,${bandAlphas[b]})`;
        ctx!.lineWidth = bandWidths[b];
        ctx!.stroke(paths[b]);
      }

      // Burst head dots — one radial gradient per burst particle
      for (const p of particles) {
        if (!p.burst || p.len < 2) continue;
        const lifeFrac = p.age / p.maxAge;
        const globalFade = Math.min(1, p.age / 8) * Math.max(0, 1 - Math.max(0, lifeFrac - 0.75) / 0.25);
        if (globalFade < 0.1) continue;
        const hx = p.trail[p.head * 2];
        const hy = p.trail[p.head * 2 + 1];
        const a = globalFade * 0.35;
        const grd = ctx!.createRadialGradient(hx, hy, 0, hx, hy, 5);
        grd.addColorStop(0, `rgba(215,220,225,${a})`);
        grd.addColorStop(1, 'rgba(215,220,225,0)');
        ctx!.beginPath();
        ctx!.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();
      }
    }

    resize();

    if (prefersReducedMotion) {
      lastFrame = 0;
      for (let i = 0; i < 150; i++) {
        lastFrame = 0;
        tick();
      }
      cancelAnimationFrame(animationId);
    } else {
      tick();
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

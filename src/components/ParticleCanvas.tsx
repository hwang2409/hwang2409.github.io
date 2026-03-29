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

interface StreamParticle {
  trail: Float64Array; // [x0,y0, x1,y1, ...] ring buffer
  head: number;        // write index into trail (in pairs)
  len: number;         // how many points currently in trail
  age: number;
  maxAge: number;
  speed: number;
  burst: boolean;
}

const TRAIL_CAP = 50;

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

    // Mouse state with decay
    let mouseX = -1000;
    let mouseY = -1000;
    let mouseStrength = 0; // decays when mouse leaves

    const FIELD_SCALE = 0.002;
    const TIME_SPEED = 0.0003;

    function spawn(): StreamParticle {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const trail = new Float64Array(TRAIL_CAP * 2);
      trail[0] = x;
      trail[1] = y;
      const burst = Math.random() < 0.06;
      return {
        trail,
        head: 0,
        len: 1,
        age: 0,
        maxAge: burst ? 100 + Math.random() * 80 : 60 + Math.random() * 100,
        speed: burst ? 1.4 + Math.random() * 0.8 : 0.6 + Math.random() * 0.7,
        burst,
      };
    }

    function resetParticle(p: StreamParticle) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      p.trail[0] = x;
      p.trail[1] = y;
      p.head = 0;
      p.len = 1;
      p.age = 0;
      p.burst = Math.random() < 0.06;
      p.maxAge = p.burst ? 100 + Math.random() * 80 : 60 + Math.random() * 100;
      p.speed = p.burst ? 1.4 + Math.random() * 0.8 : 0.6 + Math.random() * 0.7;
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
      const count = Math.max(250, Math.min(700, Math.floor(area / 2800)));
      particles = Array.from({ length: count }, spawn);
      // Stagger ages
      for (const p of particles) {
        p.age = Math.random() * p.maxAge * 0.5;
      }
    }

    function handleMouseMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseStrength = 1;
    }

    function handleMouseLeave() {
      // Don't zero out — let it decay in the draw loop
    }

    function draw() {
      time += TIME_SPEED;

      // Decay mouse influence
      mouseStrength *= 0.985;

      // Full clear — no ghosting
      ctx!.clearRect(0, 0, w, h);

      for (const p of particles) {
        // Current head position
        const hx = p.trail[p.head * 2];
        const hy = p.trail[p.head * 2 + 1];

        // Flow field — two octaves
        const a1 = noise(hx * FIELD_SCALE, hy * FIELD_SCALE + time) * Math.PI * 2;
        const a2 = noise(hx * FIELD_SCALE * 3 + 50, hy * FIELD_SCALE * 3 + time * 1.8 + 50) * Math.PI * 2;

        let vx = Math.cos(a1) * 0.65 + Math.cos(a2) * 0.35;
        let vy = Math.sin(a1) * 0.65 + Math.sin(a2) * 0.35;

        // Mouse vortex with decay
        if (mouseStrength > 0.01) {
          const dx = hx - mouseX;
          const dy = hy - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const radius = 220;
          if (dist < radius && dist > 1) {
            const s = (1 - dist / radius) * mouseStrength * 2.5;
            vx += (-dy / dist) * s * 0.8 + (-dx / dist) * s * 0.1;
            vy += (dx / dist) * s * 0.8 + (-dy / dist) * s * 0.1;
          }
        }

        const nx = hx + vx * p.speed * 1.3;
        const ny = hy + vy * p.speed * 1.3;

        // Push new position
        const newHead = (p.head + 1) % TRAIL_CAP;
        p.trail[newHead * 2] = nx;
        p.trail[newHead * 2 + 1] = ny;
        p.head = newHead;
        p.len = Math.min(p.len + 1, TRAIL_CAP);
        p.age++;

        // Reset if out of bounds or expired
        if (p.age > p.maxAge || nx < -20 || nx > w + 20 || ny < -20 || ny > h + 20) {
          resetParticle(p);
          continue;
        }

        // Draw trail — iterate from tail to head
        if (p.len < 2) continue;

        const lifeFrac = p.age / p.maxAge;
        // Global fade: ramp in during first 10%, ramp out during last 25%
        const globalFade = Math.min(1, p.age / 10) * Math.max(0, 1 - Math.max(0, lifeFrac - 0.75) / 0.25);

        if (globalFade < 0.005) continue;

        const maxAlpha = p.burst ? 0.28 : 0.13;
        const maxWidth = p.burst ? 1.8 : 1.0;

        ctx!.lineCap = 'round';

        for (let s = 0; s < p.len - 1; s++) {
          // s=0 is the oldest (tail), s=len-1 is the newest (head)
          const tailIdx = (p.head - p.len + 1 + s + TRAIL_CAP) % TRAIL_CAP;
          const nextIdx = (tailIdx + 1) % TRAIL_CAP;

          const x0 = p.trail[tailIdx * 2];
          const y0 = p.trail[tailIdx * 2 + 1];
          const x1 = p.trail[nextIdx * 2];
          const y1 = p.trail[nextIdx * 2 + 1];

          // Position along trail: 0 = tail (oldest), 1 = head (newest)
          const t = s / (p.len - 1);

          // Opacity: fades toward tail, bright at head
          const segAlpha = t * t * maxAlpha * globalFade;

          // Width: tapers toward tail
          const segWidth = (0.2 + t * 0.8) * maxWidth;

          if (segAlpha < 0.003) continue;

          // Subtle color shift: warm gray at tail → cool white at head
          const r = Math.round(180 + t * 40);
          const g = Math.round(180 + t * 45);
          const b = Math.round(185 + t * 50);

          ctx!.beginPath();
          ctx!.moveTo(x0, y0);
          ctx!.lineTo(x1, y1);
          ctx!.strokeStyle = `rgba(${r},${g},${b},${segAlpha})`;
          ctx!.lineWidth = segWidth;
          ctx!.stroke();
        }

        // Bright dot at the head of burst particles
        if (p.burst && globalFade > 0.1) {
          const headX = p.trail[p.head * 2];
          const headY = p.trail[p.head * 2 + 1];
          const dotAlpha = globalFade * 0.4;

          const grd = ctx!.createRadialGradient(headX, headY, 0, headX, headY, 6);
          grd.addColorStop(0, `rgba(220,225,230,${dotAlpha})`);
          grd.addColorStop(1, 'rgba(220,225,230,0)');
          ctx!.beginPath();
          ctx!.arc(headX, headY, 6, 0, Math.PI * 2);
          ctx!.fillStyle = grd;
          ctx!.fill();
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    resize();

    if (prefersReducedMotion) {
      for (let i = 0; i < 200; i++) draw();
      cancelAnimationFrame(animationId);
    } else {
      draw();
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

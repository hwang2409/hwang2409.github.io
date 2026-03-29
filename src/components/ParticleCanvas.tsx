'use client';

import { useEffect, useRef } from 'react';

// Simple 2D simplex noise
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

  return function noise2D(x: number, y: number): number {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

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
    if (t0 >= 0) {
      t0 *= t0;
      const g = grad[perm[ii + perm[jj]] % 8];
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const g = grad[perm[ii + i1 + perm[jj + j1]] % 8];
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const g = grad[perm[ii + 1 + perm[jj + 1]] % 8];
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
    }

    return 70 * (n0 + n1 + n2);
  };
}

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  depth: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
  pulseOffset: number;
  size: number;
  bright: boolean;
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
    let particles: Particle[] = [];
    let time = 0;
    let mouseX = -1000;
    let mouseY = -1000;
    let mouseActive = false;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    }

    function initParticles() {
      const area = window.innerWidth * window.innerHeight;
      const count = Math.max(50, Math.min(120, Math.floor(area / 12000)));
      particles = Array.from({ length: count }, (_, idx) => {
        const depth = Math.random();
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        // ~8% of particles are "bright" anchor nodes
        const bright = Math.random() < 0.08;
        return {
          x,
          y,
          baseX: x,
          baseY: y,
          depth,
          noiseOffsetX: Math.random() * 1000,
          noiseOffsetY: Math.random() * 1000,
          pulseOffset: Math.random() * Math.PI * 2,
          size: bright ? 2.0 + depth * 1.5 : 0.8 + depth * 2.0,
          bright,
        };
      });
    }

    function handleMouseMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseActive = true;
    }

    function handleMouseLeave() {
      mouseActive = false;
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      time += 0.003;

      ctx!.clearRect(0, 0, w, h);

      // Update positions using noise
      for (const p of particles) {
        const speed = 0.3 + p.depth * 0.5;

        const nx = noise(p.noiseOffsetX + time * speed, p.noiseOffsetY);
        const ny = noise(p.noiseOffsetX, p.noiseOffsetY + time * speed);

        p.x = p.baseX + nx * (80 + p.depth * 60);
        p.y = p.baseY + ny * (80 + p.depth * 60);

        p.baseX += noise(p.noiseOffsetX + time * 0.5, time) * 0.15;
        p.baseY += noise(time, p.noiseOffsetY + time * 0.5) * 0.15;

        if (p.baseX < -100) p.baseX = w + 100;
        if (p.baseX > w + 100) p.baseX = -100;
        if (p.baseY < -100) p.baseY = h + 100;
        if (p.baseY > h + 100) p.baseY = -100;

        if (mouseActive) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const repelRadius = 150 + p.depth * 80;
          if (dist < repelRadius && dist > 0) {
            const force = (1 - dist / repelRadius) * (20 + p.depth * 25);
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }
      }

      // Build adjacency for triangle mesh fills
      const maxDist = 220;
      const connections: [number, number, number][] = []; // [i, j, dist]

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          if (Math.abs(a.depth - b.depth) > 0.4) continue;

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            connections.push([i, j, dist]);
          }
        }
      }

      // Draw triangle mesh fills between triplets of connected particles
      const adjacency = new Map<number, Set<number>>();
      for (const [i, j] of connections) {
        if (!adjacency.has(i)) adjacency.set(i, new Set());
        if (!adjacency.has(j)) adjacency.set(j, new Set());
        adjacency.get(i)!.add(j);
        adjacency.get(j)!.add(i);
      }

      const drawnTriangles = new Set<string>();
      for (const [i, j, distIJ] of connections) {
        const neighborsI = adjacency.get(i);
        const neighborsJ = adjacency.get(j);
        if (!neighborsI || !neighborsJ) continue;

        for (const k of neighborsI) {
          if (k <= j) continue;
          if (!neighborsJ.has(k)) continue;

          const key = `${i}-${j}-${k}`;
          if (drawnTriangles.has(key)) continue;
          drawnTriangles.add(key);

          const a = particles[i];
          const b = particles[j];
          const c = particles[k];
          const avgDepth = (a.depth + b.depth + c.depth) / 3;

          // Very subtle filled triangles
          const triAlpha = 0.012 * avgDepth;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.lineTo(c.x, c.y);
          ctx!.closePath();
          ctx!.fillStyle = `rgba(255,255,255,${triAlpha})`;
          ctx!.fill();
        }
      }

      // Draw connection lines
      for (const [i, j, dist] of connections) {
        const a = particles[i];
        const b = particles[j];
        const avgDepth = (a.depth + b.depth) / 2;
        const alpha = 0.1 * avgDepth * (1 - dist / maxDist);

        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx!.lineWidth = 0.4 + avgDepth * 0.6;
        ctx!.stroke();
      }

      // Draw particles with glow and pulse
      for (const p of particles) {
        const pulse = Math.sin(time * 2 + p.pulseOffset) * 0.3 + 0.7;
        const baseAlpha = p.bright ? 0.25 + p.depth * 0.3 : 0.08 + p.depth * 0.15;
        const alpha = baseAlpha * pulse;
        const glowAlpha = alpha * 0.5;
        const size = p.size * (0.9 + pulse * 0.1);
        const glowRadius = p.bright ? size * 8 : size * 5;

        // Outer glow
        const gradient = ctx!.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, glowRadius
        );
        gradient.addColorStop(0, `rgba(255,255,255,${glowAlpha})`);
        gradient.addColorStop(0.4, `rgba(255,255,255,${glowAlpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.fill();

        // Core dot
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx!.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    resize();

    if (prefersReducedMotion) {
      draw();
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

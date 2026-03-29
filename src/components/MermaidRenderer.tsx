'use client';

import { useEffect } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    padding: 16,
    nodeSpacing: 50,
    rankSpacing: 60,
    htmlLabels: true,
    useMaxWidth: true,
  },
  themeVariables: {
    darkMode: true,
    background: '#111',
    primaryColor: '#1a1a1a',
    primaryTextColor: '#c0c0c0',
    primaryBorderColor: '#444',
    lineColor: '#555',
    secondaryColor: '#151515',
    tertiaryColor: '#1a1a1a',
    noteBkgColor: '#1a1a1a',
    noteTextColor: '#c0c0c0',
    clusterBkg: '#141414',
    clusterBorder: '#333',
    edgeLabelBackground: '#111',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '12px',
  },
});

function openLightbox(diagramEl: HTMLElement) {
  const overlay = document.createElement('div');
  overlay.className = 'mermaid-lightbox';

  const container = document.createElement('div');
  container.className = 'mermaid-lightbox-content';

  // Clone the diagram exactly as rendered — don't touch the SVG attributes
  const clone = diagramEl.cloneNode(true) as HTMLElement;
  clone.style.cssText = 'margin:0;border:none;background:transparent;padding:0;cursor:default;overflow:visible';
  container.appendChild(clone);

  // Compute scale: fit the diagram within 85vw x 75vh, cap at 2.5x
  const rect = diagramEl.getBoundingClientRect();
  const maxW = window.innerWidth * 0.85;
  const maxH = window.innerHeight * 0.75;
  const scale = Math.min(maxW / rect.width, maxH / rect.height, 2.5);

  container.style.transform = `scale(${scale})`;
  container.style.transformOrigin = 'center center';

  const hint = document.createElement('span');
  hint.className = 'mermaid-lightbox-hint';
  hint.textContent = 'click anywhere to close';

  overlay.appendChild(container);
  overlay.appendChild(hint);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('active'));

  overlay.addEventListener('click', () => {
    overlay.classList.remove('active');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  });
}

export default function MermaidRenderer() {
  useEffect(() => {
    let cancelled = false;

    async function render() {
      const codeBlocks = document.querySelectorAll('code.language-mermaid');
      if (codeBlocks.length === 0) return;

      // Wait for IBM Plex Mono to load so Mermaid measures text correctly
      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch {}
      }

      const ts = Date.now();

      for (let i = 0; i < codeBlocks.length; i++) {
        if (cancelled) return;

        const code = codeBlocks[i];
        const pre = code.parentElement;
        if (!pre) continue;

        let text = code.textContent || '';
        text = text
          .split('\n')
          .filter((line) => !line.trim().startsWith('style '))
          .join('\n');

        try {
          const { svg } = await mermaid.render(`m-${ts}-${i}`, text);
          if (cancelled) return;
          const wrapper = document.createElement('div');
          wrapper.className = 'mermaid-diagram';
          wrapper.innerHTML = svg;
          wrapper.style.cursor = 'pointer';
          wrapper.title = 'Click to enlarge';
          wrapper.addEventListener('click', () => openLightbox(wrapper));
          pre.replaceWith(wrapper);
        } catch (e) {
          console.error(`Mermaid render failed for block ${i}:`, e);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

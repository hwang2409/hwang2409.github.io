'use client';

import { useEffect } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
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
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '13px',
  },
});

function openLightbox(svgHtml: string) {
  const overlay = document.createElement('div');
  overlay.className = 'mermaid-lightbox';

  const container = document.createElement('div');
  container.className = 'mermaid-lightbox-content';
  container.innerHTML = svgHtml;

  const svg = container.querySelector('svg');
  if (svg) {
    svg.removeAttribute('style');
    const vb = svg.getAttribute('viewBox');
    if (vb) {
      svg.removeAttribute('width');
      svg.removeAttribute('height');
    }
    container.style.transform = 'scale(1.8)';
    container.style.transformOrigin = 'center center';
  }

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
          wrapper.addEventListener('click', () => openLightbox(svg));
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

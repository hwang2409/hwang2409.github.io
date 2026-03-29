'use client';

import { useEffect } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    padding: 20,
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

// After Mermaid renders, fix foreignObject sizing so text is centered within node shapes.
// Mermaid calculates foreignObject dimensions before the custom font fully applies to the DOM,
// so the measured width/height can be wrong. This recalculates based on actual rendered size.
function fixNodeCentering(wrapper: HTMLElement) {
  const foreignObjects = wrapper.querySelectorAll('foreignObject');

  for (const fo of foreignObjects) {
    const div = fo.querySelector('div') as HTMLElement | null;
    if (!div) continue;

    // Force the div to report its natural size
    div.style.display = 'inline-block';
    div.style.textAlign = 'center';
    div.style.width = 'auto';

    const textWidth = div.scrollWidth;
    const textHeight = div.scrollHeight;

    const foWidth = parseFloat(fo.getAttribute('width') || '0');
    const foHeight = parseFloat(fo.getAttribute('height') || '0');

    // If Mermaid's allocated size is too small, expand it
    if (textWidth > foWidth) {
      const diff = textWidth - foWidth;
      fo.setAttribute('width', String(textWidth + 4));
      const foX = parseFloat(fo.getAttribute('x') || '0');
      fo.setAttribute('x', String(foX - diff / 2 - 2));
    }
    if (textHeight > foHeight) {
      const diff = textHeight - foHeight;
      fo.setAttribute('height', String(textHeight + 4));
      const foY = parseFloat(fo.getAttribute('y') || '0');
      fo.setAttribute('y', String(foY - diff / 2 - 2));
    }

    // Now make the div fill the foreignObject and center its content
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.textAlign = 'center';
    div.style.width = '100%';
    div.style.height = '100%';
  }
}

function openLightbox(diagramEl: HTMLElement) {
  const overlay = document.createElement('div');
  overlay.className = 'mermaid-lightbox';

  const container = document.createElement('div');
  container.className = 'mermaid-lightbox-content';

  const clone = diagramEl.cloneNode(true) as HTMLElement;
  clone.style.cssText = 'margin:0;border:none;background:transparent;padding:0;cursor:default;overflow:visible';
  container.appendChild(clone);

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

          // Fix centering after the SVG is in the DOM and laid out
          requestAnimationFrame(() => {
            fixNodeCentering(wrapper);
          });
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

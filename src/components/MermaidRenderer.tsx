'use client';

import { useEffect } from 'react';
import mermaid from 'mermaid';

type SiteTheme = 'light' | 'dark';

function getTheme(): SiteTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function configureMermaid(theme: SiteTheme) {
  const isDark = theme === 'dark';

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    flowchart: {
      padding: 20,
      nodeSpacing: 50,
      rankSpacing: 60,
      htmlLabels: true,
      useMaxWidth: true,
    },
    themeVariables: {
      darkMode: isDark,
      background: isDark ? '#181818' : '#ffffff',
      primaryColor: isDark ? '#242424' : '#ffffff',
      primaryTextColor: isDark ? '#eeeeee' : '#111111',
      primaryBorderColor: isDark ? '#777777' : '#777777',
      lineColor: isDark ? '#aaaaaa' : '#555555',
      secondaryColor: isDark ? '#181818' : '#f7f7f7',
      tertiaryColor: isDark ? '#242424' : '#f2f2f2',
      noteBkgColor: isDark ? '#242424' : '#f7f7f7',
      noteTextColor: isDark ? '#eeeeee' : '#111111',
      clusterBkg: isDark ? '#181818' : '#ffffff',
      clusterBorder: isDark ? '#777777' : '#999999',
      edgeLabelBackground: isDark ? '#181818' : '#ffffff',
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '12px',
    },
  });
}

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

    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.textAlign = 'center';
    div.style.width = '100%';
    div.style.height = '100%';
  }
}

export default function MermaidRenderer() {
  useEffect(() => {
    let cancelled = false;

    async function render() {
      const targets = document.querySelectorAll<HTMLElement>(
        'code.language-mermaid, .mermaid-diagram[data-source]'
      );
      if (targets.length === 0) return;

      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch {}
      }

      configureMermaid(getTheme());
      const ts = Date.now();

      for (let i = 0; i < targets.length; i++) {
        if (cancelled) return;

        const target = targets[i];
        const isRenderedDiagram = target.classList.contains('mermaid-diagram');
        const replaceTarget = isRenderedDiagram ? target : target.parentElement;
        if (!replaceTarget) continue;

        let text = isRenderedDiagram
          ? target.dataset.source || ''
          : target.textContent || '';
        text = text
          .split('\n')
          .filter((line) => !line.trim().startsWith('style '))
          .join('\n');

        try {
          const { svg } = await mermaid.render(`m-${ts}-${i}`, text);
          if (cancelled) return;
          const wrapper = document.createElement('div');
          wrapper.className = 'mermaid-diagram';
          wrapper.dataset.source = text;
          wrapper.innerHTML = svg;
          replaceTarget.replaceWith(wrapper);

          requestAnimationFrame(() => {
            fixNodeCentering(wrapper);
          });
        } catch (e) {
          console.error(`Mermaid render failed for block ${i}:`, e);
        }
      }
    }

    render();
    window.addEventListener('site-theme-change', render);

    return () => {
      cancelled = true;
      window.removeEventListener('site-theme-change', render);
    };
  }, []);

  return null;
}

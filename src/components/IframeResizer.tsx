'use client';

import { useEffect } from 'react';

export default function IframeResizer() {
  useEffect(() => {
    const iframes = Array.from(document.querySelectorAll('iframe'));

    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');

    const syncIframeThemes = () => {
      const theme = colorScheme.matches ? 'dark' : 'light';

      document.querySelectorAll('iframe').forEach((iframe) => {
        iframe.contentWindow?.postMessage(
          { type: 'site-theme', theme },
          window.location.origin
        );
      });
    };

    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'wm-resize' && typeof e.data.height === 'number') {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
          try {
            if (iframe.contentWindow === e.source) {
              iframe.style.height = e.data.height + 'px';
            }
          } catch {
            // cross-origin, skip
          }
        });
      }
    };

    window.addEventListener('message', handler);
    colorScheme.addEventListener('change', syncIframeThemes);
    iframes.forEach((iframe) => {
      iframe.addEventListener('load', syncIframeThemes);
    });
    syncIframeThemes();

    return () => {
      window.removeEventListener('message', handler);
      colorScheme.removeEventListener('change', syncIframeThemes);
      iframes.forEach((iframe) => {
        iframe.removeEventListener('load', syncIframeThemes);
      });
    };
  }, []);

  return null;
}

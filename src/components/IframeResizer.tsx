'use client';

import { useEffect } from 'react';

export default function IframeResizer() {
  useEffect(() => {
    const iframes = Array.from(document.querySelectorAll('iframe'));

    const syncIframeThemes = () => {
      const theme =
        document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

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
    window.addEventListener('site-theme-change', syncIframeThemes);
    iframes.forEach((iframe) => {
      iframe.addEventListener('load', syncIframeThemes);
    });
    syncIframeThemes();

    return () => {
      window.removeEventListener('message', handler);
      window.removeEventListener('site-theme-change', syncIframeThemes);
      iframes.forEach((iframe) => {
        iframe.removeEventListener('load', syncIframeThemes);
      });
    };
  }, []);

  return null;
}

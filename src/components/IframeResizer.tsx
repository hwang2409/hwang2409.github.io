'use client';

import { useEffect } from 'react';

export default function IframeResizer() {
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'wm-resize' && typeof e.data.height === 'number') {
        // Find all iframes and match by origin
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
    return () => window.removeEventListener('message', handler);
  }, []);

  return null;
}

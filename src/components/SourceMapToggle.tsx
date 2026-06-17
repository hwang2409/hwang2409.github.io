'use client';

import { useEffect, useState } from 'react';

export default function SourceMapToggle() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const article = document.querySelector<HTMLElement>('.post-article');
    if (!article) return;

    article.dataset.sourceMap = active ? 'on' : 'off';

    return () => {
      article.dataset.sourceMap = 'off';
    };
  }, [active]);

  return (
    <button
      type="button"
      className="case-toggle"
      aria-pressed={active}
      aria-label={active ? 'Hide post sources' : 'Show post sources'}
      onClick={() => setActive((current) => !current)}
    >
      {active ? 'hide sources' : 'sources'}
    </button>
  );
}

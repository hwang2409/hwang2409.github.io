'use client';

import { useEffect, useState } from 'react';

const storageKey = 'blog-case';

type BlogCase = 'normal' | 'lower';

function applyBlogCase(blogCase: BlogCase) {
  document.documentElement.dataset.blogCase = blogCase;
  window.localStorage.setItem(storageKey, blogCase);
}

export default function BlogCaseToggle() {
  const [blogCase, setBlogCase] = useState<BlogCase>('normal');

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const initial = saved === 'lower' ? 'lower' : 'normal';
    applyBlogCase(initial);
    setBlogCase(initial);

    return () => {
      document.documentElement.dataset.blogCase = 'normal';
    };
  }, []);

  const lowerActive = blogCase === 'lower';
  const nextCase: BlogCase = lowerActive ? 'normal' : 'lower';

  return (
    <button
      type="button"
      className="case-toggle"
      aria-pressed={lowerActive}
      aria-label={lowerActive ? 'Use normal blog case' : 'Use lowercase blog case'}
      onClick={() => {
        applyBlogCase(nextCase);
        setBlogCase(nextCase);
      }}
    >
      {lowerActive ? 'normal case' : 'lowercase'}
    </button>
  );
}

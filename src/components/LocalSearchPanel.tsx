'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SearchDocument } from '@/lib/siteIndex';

type SearchHit = {
  document: SearchDocument;
  score: number;
  reasons: string[];
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function queryTerms(query: string) {
  return Array.from(new Set(query.toLowerCase().match(/[a-z0-9]+/g) || []));
}

function countTerm(text: string, term: string) {
  const matches = text.toLowerCase().match(new RegExp(`\\b${escapeRegExp(term)}\\b`, 'g'));
  return matches ? matches.length : 0;
}

function scoreDocument(document: SearchDocument, terms: string[]): SearchHit | null {
  if (terms.length === 0) return null;

  let score = 0;
  const reasons: string[] = [];
  const headings = document.headings.join(' ');

  terms.forEach((term) => {
    const titleHits = countTerm(document.title, term);
    const headingHits = countTerm(headings, term);
    const excerptHits = countTerm(document.excerpt, term);
    const bodyHits = countTerm(document.text, term);

    if (titleHits > 0) {
      score += titleHits * 8;
      reasons.push('title');
    }

    if (headingHits > 0) {
      score += headingHits * 5;
      reasons.push('heading');
    }

    if (excerptHits > 0) {
      score += excerptHits * 4;
      reasons.push('excerpt');
    }

    if (bodyHits > 0) {
      score += bodyHits;
      reasons.push('body');
    }
  });

  if (score === 0) return null;

  return {
    document,
    score,
    reasons,
  };
}

export default function LocalSearchPanel({ documents }: { documents: SearchDocument[] }) {
  const [query, setQuery] = useState('cuda memory');
  const terms = useMemo(() => queryTerms(query), [query]);
  const hits = useMemo(
    () =>
      documents
        .map((document) => scoreDocument(document, terms))
        .filter((hit): hit is SearchHit => Boolean(hit))
        .sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title))
        .slice(0, 5),
    [documents, terms]
  );

  return (
    <section className="lab-panel" aria-labelledby="local-search">
      <div className="lab-panel-heading">
        <div>
          <h2 id="local-search">search posts</h2>
          <p>type a phrase and the browser searches the local blog index</p>
        </div>
        <span>{documents.length} docs</span>
      </div>

      <div className="lab-search">
        <label htmlFor="site-search-query">query</label>
        <input
          id="site-search-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <ol className="search-hit-list">
        {hits.length > 0 ? (
          hits.map((hit) => (
            <li key={hit.document.slug}>
              <Link href={hit.document.href}>{hit.document.title}</Link>
              <p>{hit.document.excerpt}</p>
              <details className="search-hit-detail">
                <summary>why this matched</summary>
                <div>{Array.from(new Set(hit.reasons)).join(', ')}</div>
              </details>
            </li>
          ))
        ) : (
          <li className="search-empty">no matches yet</li>
        )}
      </ol>
    </section>
  );
}

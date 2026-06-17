'use client';

import { useEffect, useState } from 'react';
import { predictNextToken } from '@/lib/localNgram';
import type { ClientNGramModel } from '@/lib/localNgram';

type GhostState = {
  x: number;
  y: number;
  token: string;
  score: number;
};

type DocumentWithCaret = Document & {
  caretPositionFromPoint?: (
    x: number,
    y: number
  ) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function closestReadableBlock(target: EventTarget | null) {
  const element = target instanceof Element ? target : null;
  return element?.closest<HTMLElement>('.prose p, .prose li, .prose h2, .prose h3, .prose td') || null;
}

function caretAtPoint(x: number, y: number) {
  const doc = document as DocumentWithCaret;
  const position = doc.caretPositionFromPoint?.(x, y);

  if (position) {
    return { node: position.offsetNode, offset: position.offset };
  }

  const range = doc.caretRangeFromPoint?.(x, y);
  if (range) {
    return { node: range.startContainer, offset: range.startOffset };
  }

  return null;
}

function textBeforePoint(root: HTMLElement, x: number, y: number) {
  const caret = caretAtPoint(x, y);
  if (!caret || !root.contains(caret.node)) {
    return root.textContent || '';
  }

  const range = document.createRange();
  range.selectNodeContents(root);

  try {
    range.setEnd(caret.node, caret.offset);
    return range.toString();
  } catch {
    return root.textContent || '';
  }
}

export default function BlogTokenGhost({ model }: { model: ClientNGramModel }) {
  const [ghost, setGhost] = useState<GhostState | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    function hideGhost() {
      setGhost(null);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!armed) {
        hideGhost();
        return;
      }

      const block =
        closestReadableBlock(event.target) ||
        document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLElement>('.prose p, .prose li, .prose h2, .prose h3, .prose td') ||
        null;
      if (!block) {
        hideGhost();
        return;
      }

      const context = textBeforePoint(block, event.clientX, event.clientY).trim();
      if (context.length < 3) {
        hideGhost();
        return;
      }

      const result = predictNextToken(model, context, 8);
      const prediction =
        result.predictions.find((candidate) => /[a-z0-9]/i.test(candidate.token)) ||
        result.predictions[0];
      if (!prediction) {
        hideGhost();
        return;
      }

      setGhost({
        x: event.clientX + 14,
        y: event.clientY + 14,
        token: prediction.token,
        score: prediction.score,
      });
    }

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerleave', hideGhost);
    window.addEventListener('blur', hideGhost);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', hideGhost);
      window.removeEventListener('blur', hideGhost);
    };
  }, [armed, model]);

  return (
    <>
      <button
        type="button"
        className="token-ghost-hint"
        aria-pressed={armed}
        aria-label={armed ? 'Disable word guessing' : 'Enable word guessing'}
        onClick={() => setArmed((current) => !current)}
      >
        {armed ? 'hover words' : 'word guess'}
      </button>
      {ghost ? (
        <div
          className="token-ghost"
          style={{ left: `${ghost.x}px`, top: `${ghost.y}px` }}
          role="status"
        >
          <span>next word</span>
          <strong>{ghost.token}</strong>
          <span>{Math.round(ghost.score * 100)}%</span>
        </div>
      ) : null}
    </>
  );
}

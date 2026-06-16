'use client';

import { useEffect } from 'react';

type Token = {
  kind: string;
  value: string;
};

const fallbackLiterals = new Set([
  'False',
  'None',
  'True',
  'false',
  'null',
  'nullptr',
  'true',
  'undefined',
]);

const punctuationChars = new Set('{}[]()<>+-=*/%!:.,;|&?~^');

function escapeTokenValue(value: string) {
  return JSON.stringify(value).slice(1, -1);
}

function readWhile(value: string, start: number, test: (char: string) => boolean) {
  let index = start;
  while (index < value.length && test(value[index])) {
    index += 1;
  }
  return index;
}

function tokenizePlainText(value: string) {
  const tokens: Token[] = [];
  let index = 0;

  while (index < value.length) {
    const char = value[index];

    if (/\s/.test(char)) {
      index = readWhile(value, index, (current) => /\s/.test(current));
      continue;
    }

    if (/\d/.test(char)) {
      const end = readWhile(value, index, (current) => /[\w.]/.test(current));
      tokens.push({ kind: 'literal', value: value.slice(index, end) });
      index = end;
      continue;
    }

    if (/[A-Za-z_$]/.test(char)) {
      const end = readWhile(value, index, (current) => /[\w$-]/.test(current));
      const word = value.slice(index, end);
      tokens.push({
        kind: fallbackLiterals.has(word) ? 'literal' : 'identifier',
        value: word,
      });
      index = end;
      continue;
    }

    if (punctuationChars.has(char)) {
      tokens.push({ kind: 'punctuation', value: char });
    }

    index += 1;
  }

  return tokens;
}

function collectTokens(code: HTMLElement): Token[] {
  const tokens: Token[] = [];

  function visit(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      tokens.push(...tokenizePlainText(node.textContent || ''));
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    const kind = node.dataset.token;
    const value = node.textContent;

    if (kind && value && value.trim().length > 0) {
      tokens.push({ kind, value });
      return;
    }

    node.childNodes.forEach(visit);
  }

  code.childNodes.forEach(visit);

  return tokens;
}

function tokenLines(tokens: Token[]) {
  const width = Math.max(...tokens.map((token) => token.kind.length), 0);

  return tokens
    .map((token) => `${token.kind.padEnd(width)}  ${escapeTokenValue(token.value)}`)
    .join('\n');
}

function makeButton(label: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  return button;
}

function setActiveButton(sourceButton: HTMLButtonElement, tokenButton: HTMLButtonElement, mode: 'source' | 'tokens') {
  sourceButton.ariaPressed = String(mode === 'source');
  tokenButton.ariaPressed = String(mode === 'tokens');
}

export default function CodeTokenInspector() {
  useEffect(() => {
    const codeBlocks = document.querySelectorAll<HTMLElement>('.prose pre code');

    codeBlocks.forEach((code) => {
      const pre = code.parentElement;
      if (!(pre instanceof HTMLPreElement)) return;
      if (pre.dataset.tokenInspector === 'ready') return;
      if (!code.querySelector('[data-token]')) return;
      if (code.classList.contains('language-mermaid')) return;

      const tokens = collectTokens(code);
      if (tokens.length === 0) return;

      pre.dataset.tokenInspector = 'ready';

      const sourceHtml = code.innerHTML;
      const sourceClassName = code.className;
      const tokensText = tokenLines(tokens);

      const tools = document.createElement('div');
      tools.className = 'code-tools';

      const sourceButton = makeButton('source');
      const tokenButton = makeButton('tokens');
      tools.append(sourceButton, tokenButton);

      const showSource = () => {
        code.className = sourceClassName;
        code.innerHTML = sourceHtml;
        pre.dataset.mode = 'source';
        setActiveButton(sourceButton, tokenButton, 'source');
      };

      const showTokens = () => {
        code.className = 'token-view';
        code.textContent = tokensText;
        pre.dataset.mode = 'tokens';
        setActiveButton(sourceButton, tokenButton, 'tokens');
      };

      sourceButton.addEventListener('click', showSource);
      tokenButton.addEventListener('click', showTokens);
      setActiveButton(sourceButton, tokenButton, 'source');
      pre.before(tools);
    });
  }, []);

  return null;
}

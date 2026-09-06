import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import type { Element, Root, Text } from 'hast';

type RawNode = Extract<Root['children'][number] | Element['children'][number], { type: 'raw' }>;

type MarkdownSource = {
  slug: string;
};

export type MarkdownSection = {
  readonly id: string;
  readonly title: string;
};

type SyntaxClass = {
  matches: string[];
  tone: string;
  token: string;
};

const syntaxToneRules: SyntaxClass[] = [
  { matches: ['hljs-comment', 'hljs-meta'], tone: 'comment', token: 'comment' },
  {
    matches: ['hljs-keyword', 'hljs-selector-tag', 'hljs-built_in', 'hljs-name', 'hljs-tag'],
    tone: 'keyword',
    token: 'keyword',
  },
  { matches: ['function_'], tone: 'title', token: 'function' },
  { matches: ['title.class_', 'hljs-type'], tone: 'title', token: 'type' },
  { matches: ['hljs-title'], tone: 'title', token: 'symbol' },
  {
    matches: ['hljs-string', 'hljs-attr', 'hljs-regexp', 'hljs-symbol'],
    tone: 'string',
    token: 'string',
  },
  { matches: ['hljs-number', 'hljs-literal'], tone: 'literal', token: 'literal' },
  {
    matches: ['hljs-variable', 'hljs-template-variable', 'hljs-property', 'hljs-params'],
    tone: 'identifier',
    token: 'identifier',
  },
  {
    matches: ['hljs-operator', 'hljs-punctuation'],
    tone: 'punctuation',
    token: 'punctuation',
  },
];

const fallbackKeywords = new Set([
  'and',
  'as',
  'async',
  'await',
  'auto',
  'bool',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'def',
  'delete',
  'do',
  'double',
  'else',
  'enum',
  'export',
  'extends',
  'float',
  'for',
  'from',
  'function',
  'if',
  'import',
  'in',
  'include',
  'int',
  'interface',
  'let',
  'namespace',
  'new',
  'not',
  'or',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'struct',
  'switch',
  'template',
  'this',
  'throw',
  'try',
  'type',
  'typename',
  'using',
  'var',
  'void',
  'while',
]);

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

function cleanHeadingText(value: string) {
  return value
    .replace(/\s+#+\s*$/u, '')
    .replace(/[`*_~]/gu, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .trim();
}

function headingSlug(value: string) {
  const slug = cleanHeadingText(value)
    .toLowerCase()
    .replace(/[^\w\s-]/gu, '')
    .replace(/\s+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '');
  return slug || 'section';
}

function uniqueHeadingId(base: string, usedIds: Set<string>) {
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function getClassNames(node: Element): string[] {
  const className = node.properties?.className;
  if (!Array.isArray(className)) return [];
  return className.filter((item): item is string => typeof item === 'string');
}

function classifySyntaxToken(classNames: string[]) {
  const classSet = new Set(classNames);

  for (const rule of syntaxToneRules) {
    if (rule.matches.some((match) => classSet.has(match))) {
      return { tone: rule.tone, token: rule.token };
    }
  }

  return null;
}

function createText(value: string): Text {
  return { type: 'text', value };
}

function createElement(
  tagName: string,
  properties: Element['properties'],
  children: Element['children'] = []
): Element {
  return {
    type: 'element',
    tagName,
    properties,
    children,
  };
}

function createSyntaxElement(tone: string, token: string, value: string): Element {
  return createElement('span', { dataTone: tone, dataToken: token }, [createText(value)]);
}

function readQuotedString(value: string, start: number) {
  const quote = value[start];
  let index = start + 1;

  while (index < value.length) {
    if (value[index] === '\\') {
      index += 2;
      continue;
    }

    if (value[index] === quote) {
      index += 1;
      break;
    }

    index += 1;
  }

  return index;
}

function readWhile(value: string, start: number, test: (char: string) => boolean) {
  let index = start;
  while (index < value.length && test(value[index])) {
    index += 1;
  }
  return index;
}

function nextNonWhitespace(value: string, start: number) {
  let index = start;
  while (index < value.length && /\s/.test(value[index])) {
    index += 1;
  }
  return value[index];
}

function pushToken(
  nodes: Array<Text | Element>,
  tone: string | null,
  value: string,
  token = tone
) {
  if (value.length === 0) return;
  nodes.push(tone && token ? createSyntaxElement(tone, token, value) : createText(value));
}

function tokenizeCode(value: string): Array<Text | Element> {
  const nodes: Array<Text | Element> = [];
  let index = 0;

  while (index < value.length) {
    const char = value[index];
    const next = value[index + 1];

    if (/\s/.test(char)) {
      const end = readWhile(value, index, (current) => /\s/.test(current));
      pushToken(nodes, null, value.slice(index, end));
      index = end;
      continue;
    }

    if (char === '/' && next === '/') {
      const end = value.indexOf('\n', index);
      const stop = end === -1 ? value.length : end;
      pushToken(nodes, 'comment', value.slice(index, stop));
      index = stop;
      continue;
    }

    if (char === '/' && next === '*') {
      const end = value.indexOf('*/', index + 2);
      const stop = end === -1 ? value.length : end + 2;
      pushToken(nodes, 'comment', value.slice(index, stop));
      index = stop;
      continue;
    }

    if (char === '#') {
      const end = value.indexOf('\n', index);
      const stop = end === -1 ? value.length : end;
      const line = value.slice(index, stop);
      const tone = /^#\s*(include|define|if|ifdef|ifndef|endif|pragma)\b/.test(line)
        ? 'keyword'
        : 'comment';
      pushToken(nodes, tone, line);
      index = stop;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      const end = readQuotedString(value, index);
      pushToken(nodes, 'string', value.slice(index, end));
      index = end;
      continue;
    }

    if (/\d/.test(char)) {
      const end = readWhile(value, index, (current) => /[\w.]/.test(current));
      pushToken(nodes, 'literal', value.slice(index, end));
      index = end;
      continue;
    }

    if (/[A-Za-z_$]/.test(char)) {
      const end = readWhile(value, index, (current) => /[\w$-]/.test(current));
      const word = value.slice(index, end);
      const following = nextNonWhitespace(value, end);
      const tone = fallbackKeywords.has(word)
        ? 'keyword'
        : fallbackLiterals.has(word)
          ? 'literal'
          : following === '('
            ? 'title'
            : 'identifier';
      const token = following === '(' && tone === 'title' ? 'function' : tone;

      pushToken(nodes, tone, word, token);
      index = end;
      continue;
    }

    if (punctuationChars.has(char)) {
      pushToken(nodes, 'punctuation', char);
      index += 1;
      continue;
    }

    pushToken(nodes, null, char);
    index += 1;
  }

  return nodes;
}

function isMermaidCodeBlock(node: Element) {
  return getClassNames(node).includes('language-mermaid');
}

function hasSyntaxElements(node: Element) {
  return node.children.some((child) => child.type === 'element');
}

function getTextContent(node: Element) {
  return node.children
    .filter((child): child is Text => child.type === 'text')
    .map((child) => child.value)
    .join('');
}

function getElementText(node: Element): string {
  return node.children
    .map((child) => {
      if (child.type === 'text') return child.value;
      if (child.type === 'element') return getElementText(child);
      return '';
    })
    .join('');
}

function visitElements(
  node: Root | Element,
  visitor: (node: Element, parent: Root | Element | null) => void,
  parent: Root | Element | null = null
) {
  if (node.type === 'element') {
    visitor(node, parent);
  }

  if ('children' in node) {
    for (const child of node.children) {
      if (child.type === 'element') {
        visitElements(child, visitor, node);
      }
    }
  }
}

function rehypeMonochromeSyntax() {
  return (tree: Root) => {
    visitElements(tree, (node, parent) => {
      if (
        node.tagName === 'code' &&
        parent?.type === 'element' &&
        parent.tagName === 'pre' &&
        !isMermaidCodeBlock(node) &&
        !hasSyntaxElements(node)
      ) {
        node.children = tokenizeCode(getTextContent(node));
      }

      const syntax = classifySyntaxToken(getClassNames(node));
      if (!syntax) return;

      node.properties = {
        ...node.properties,
        dataTone: syntax.tone,
        dataToken: syntax.token,
      };
    });
  };
}

function rehypeHeadingIds(sections?: MarkdownSection[]) {
  return (tree: Root) => {
    const usedIds = new Set<string>();

    visitElements(tree, (node) => {
      if (!/^h[1-6]$/u.test(node.tagName)) return;

      const title = cleanHeadingText(getElementText(node));
      const id = uniqueHeadingId(headingSlug(title), usedIds);
      node.properties = {
        ...node.properties,
        id,
      };

      if (node.tagName === 'h2') sections?.push({ id, title });
    });
  };
}

function rehypeFigures() {
  return (tree: Root) => {
    let figureCount = 0;

    function isCaptionNode(
      node: Root['children'][number] | Element['children'][number],
    ): node is RawNode {
      return node.type === 'raw' && /^<figcaption\b[\s\S]*<\/figcaption>$/i.test(node.value.trim());
    }

    function isImageParagraph(node: Element) {
      return (
        node.tagName === 'p' &&
        node.children.some((child) => isElement(child) && child.tagName === 'img') &&
        node.children.every(
          (child) => child.type === 'text' && child.value.trim().length === 0 ||
            isElement(child) && child.tagName === 'img',
        )
      );
    }

    function transform(parent: Root | Element) {
      const children = parent.children as Array<
        Root['children'][number] | Element['children'][number]
      >;

      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        if (!isElement(child)) continue;

        if (isImageParagraph(child)) {
          const image = child.children.find(
            (candidate): candidate is Element => isElement(candidate) && candidate.tagName === 'img',
          );
          if (!image) continue;

          figureCount += 1;
          const alt = image.properties?.alt;
          const caption = typeof alt === 'string' && alt.length > 0 ? alt : 'untitled image';
          let captionNode: RawNode | null = null;
          let captionIndex = -1;

          for (let nextIndex = index + 1; nextIndex < children.length; nextIndex += 1) {
            const next = children[nextIndex];
            if (next.type === 'text' && next.value.trim().length === 0) continue;
            if (isCaptionNode(next)) {
              captionNode = next;
              captionIndex = nextIndex;
            }
            break;
          }

          children[index] = createElement('figure', {}, [
            image,
            captionNode ?? createElement('figcaption', {}, [
              createText(`fig. ${figureCount} — ${caption}`),
            ]),
          ]);
          if (captionIndex !== -1) children.splice(captionIndex, 1);
          continue;
        }

        transform(child);
      }
    }

    transform(tree);
  };
}

function isElement(node: Root['children'][number] | Element['children'][number]): node is Element {
  return node.type === 'element';
}

function isText(node: Element['children'][number]): node is Text {
  return node.type === 'text';
}

function findSidenoteMarker(node: Element) {
  if (node.tagName !== 'blockquote') return null;

  const firstParagraph = node.children.find(
    (child): child is Element => isElement(child) && child.tagName === 'p'
  );
  if (!firstParagraph) return null;

  const firstChild = firstParagraph.children[0];
  if (!firstChild || !isText(firstChild)) return null;

  const marker = firstChild.value.match(/^\[!(side|aside)\]\s*/i);
  if (!marker) return null;

  firstChild.value = firstChild.value.slice(marker[0].length);
  return firstParagraph;
}

function rehypeSidenotes() {
  return (tree: Root) => {
    function transform(parent: Root | Element) {
      const children = parent.children as Array<
        Root['children'][number] | Element['children'][number]
      >;

      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        if (!isElement(child)) continue;

        const markerParagraph = findSidenoteMarker(child);

        if (markerParagraph) {
          markerParagraph.children.unshift(
            createElement('em', { className: ['sidenote-label'] }, [createText('note:')]),
            createText(' '),
          );

          child.tagName = 'aside';
          child.properties = {
            ...child.properties,
            className: ['sidenote'],
          };

          if (
            markerParagraph.children.length === 1 &&
            isText(markerParagraph.children[0]) &&
            markerParagraph.children[0].value.length === 0
          ) {
            child.children = child.children.filter((noteChild) => noteChild !== markerParagraph);
          }

          continue;
        }

        transform(child);
      }
    }

    transform(tree);
  };
}

function sourceKindForTag(tagName: string) {
  if (/^h[1-6]$/.test(tagName)) return 'heading';
  if (tagName === 'pre') return 'code';
  if (tagName === 'table') return 'table';
  if (tagName === 'blockquote' || tagName === 'aside') return 'note';
  if (tagName === 'li') return 'item';
  return 'paragraph';
}

function rehypeSourceMap(source?: MarkdownSource) {
  return (tree: Root) => {
    if (!source) return;

    visitElements(tree, (node) => {
      if (!['p', 'h2', 'h3', 'li', 'pre', 'table', 'blockquote', 'aside'].includes(node.tagName)) {
        return;
      }

      const position = node.position;
      const line = position?.start.line;
      if (!line) return;

      node.properties = {
        ...node.properties,
        dataSource: `${source.slug}.md:${line}`,
        dataSourceKind: sourceKindForTag(node.tagName),
      };
    });
  };
}

async function processMarkdown(
  markdown: string,
  source?: MarkdownSource,
  sections?: MarkdownSection[],
): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight, { plainText: ['mermaid'] })
    .use(rehypeHeadingIds, sections)
    .use(rehypeMonochromeSyntax)
    .use(rehypeFigures)
    .use(rehypeSidenotes)
    .use(rehypeSourceMap, source)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return result.toString();
}

export async function markdownToHtml(
  markdown: string,
  source?: MarkdownSource,
): Promise<string> {
  return processMarkdown(markdown, source);
}

export async function markdownToHtmlWithSections(
  markdown: string,
  source?: MarkdownSource,
): Promise<{ html: string; sections: MarkdownSection[] }> {
  const sections: MarkdownSection[] = [];
  const html = await processMarkdown(markdown, source, sections);
  return { html, sections };
}

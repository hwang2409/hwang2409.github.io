import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import type { Element, Root, Text } from 'hast';

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
}

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

function findPreviousAnchorTarget(
  children: Array<Root['children'][number] | Element['children'][number]>,
  index: number
) {
  for (let offset = index - 1; offset >= 0; offset -= 1) {
    const child = children[offset];
    if (!isElement(child)) continue;

    if (['p', 'h2', 'h3', 'li'].includes(child.tagName)) {
      return child;
    }
  }

  return null;
}

function ensureElementId(element: Element, id: string) {
  const existingId = element.properties?.id;
  if (typeof existingId === 'string') return existingId;

  element.properties = {
    ...element.properties,
    id,
  };

  return id;
}

function appendSidenoteRef(target: Element, noteId: string, index: number) {
  target.children.push(
    createText(' '),
    createElement(
      'a',
      {
        className: ['sidenote-ref'],
        href: `#${noteId}`,
        ariaLabel: `Read side note ${index}`,
      },
      [createText(`[${index}]`)]
    )
  );
}

function rehypeSidenotes() {
  return (tree: Root) => {
    let noteCount = 0;

    function transform(parent: Root | Element) {
      const children = parent.children as Array<
        Root['children'][number] | Element['children'][number]
      >;

      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        if (!isElement(child)) continue;

        const markerParagraph = findSidenoteMarker(child);

        if (markerParagraph) {
          noteCount += 1;
          const noteId = `sidenote-${noteCount}`;
          const target = findPreviousAnchorTarget(children, index);
          let targetId: string | null = null;

          if (target) {
            targetId = ensureElementId(target, `sidenote-target-${noteCount}`);
            appendSidenoteRef(target, noteId, noteCount);
          }

          child.tagName = 'aside';
          child.properties = {
            ...child.properties,
            id: noteId,
            className: ['sidenote'],
            ...(targetId
              ? {
                  ariaLabelledBy: targetId,
                }
              : {}),
          };

          if (targetId) {
            child.children.unshift(
              createElement(
                'a',
                {
                  className: ['sidenote-backref'],
                  href: `#${targetId}`,
                  ariaLabel: `Back to side note reference ${noteCount}`,
                },
                [createText(`// ${noteCount}`)]
              )
            );
          }

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

export function getAllBlogPosts(): BlogPost[] {
  const blogDir = path.join(process.cwd(), 'content', 'blog');

  if (!fs.existsSync(blogDir)) {
    return [];
  }

  const files = fs.readdirSync(blogDir);
  const posts: BlogPost[] = [];

  for (const file of files) {
    if (file.endsWith('.md')) {
      const slug = file.replace('.md', '');
      const post = getBlogPost(slug);
      if (post) {
        posts.push(post);
      }
    }
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getBlogPost(slug: string): BlogPost | null {
  try {
    const filePath = path.join(
      process.cwd(),
      'content',
      'blog',
      `${slug}.md`
    );

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    const dateValue = data.date;
    const dateStr =
      dateValue instanceof Date
        ? dateValue.toISOString().split('T')[0]
        : String(dateValue || '');

    return {
      slug,
      title: data.title || '',
      date: dateStr,
      excerpt: data.excerpt || '',
      content: content.trim(),
    };
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error);
    return null;
  }
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight, { plainText: ['mermaid'] })
    .use(rehypeMonochromeSyntax)
    .use(rehypeSidenotes)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return result.toString();
}

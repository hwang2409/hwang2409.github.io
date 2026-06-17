import fs from 'fs';
import path from 'path';
import { getAllBlogPosts } from '@/lib/blog';
import { createNGramModel } from '@/lib/localNgram';
import type { SearchDocument } from '@/lib/siteIndex';

const markdownSyntaxPattern =
  /```[\s\S]*?```|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|[#>*_`|:-]/g;

function plainTextFromMarkdown(markdown: string) {
  return markdown
    .replace(markdownSyntaxPattern, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function headingsFromMarkdown(markdown: string) {
  return Array.from(markdown.matchAll(/^#{1,3}\s+(.+)$/gm), (match) =>
    match[1].replace(/`/g, '').trim()
  ).filter(Boolean);
}

function readBackendCorpus() {
  const corpusPath = path.join(process.cwd(), 'backend', 'data', 'site_corpus.txt');
  return fs.existsSync(corpusPath) ? fs.readFileSync(corpusPath, 'utf8') : '';
}

export function getSearchDocuments(): SearchDocument[] {
  return getAllBlogPosts().map((post) => {
    const text = plainTextFromMarkdown(post.content);

    return {
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
      href: `/blog/${post.slug}`,
      headings: headingsFromMarkdown(post.content),
      text,
    };
  });
}

export function getSiteCorpusText() {
  const posts = getAllBlogPosts();
  const postCorpus = posts
    .map((post) => [post.title, post.excerpt, plainTextFromMarkdown(post.content)].join('\n'))
    .join('\n\n');

  return [postCorpus, readBackendCorpus()].filter(Boolean).join('\n\n');
}

export function getClientNGramModel() {
  return createNGramModel(getSiteCorpusText(), 3, 8);
}

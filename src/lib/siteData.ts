import fs from 'fs';
import path from 'path';
import { getAllBlogPosts } from '@/lib/blog';
import { createNGramModel } from '@/lib/localNgram';

const markdownSyntaxPattern =
  /```[\s\S]*?```|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|[#>*_`|:-]/g;

function plainTextFromMarkdown(markdown: string) {
  return markdown
    .replace(markdownSyntaxPattern, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readBackendCorpus() {
  const corpusPath = path.join(process.cwd(), 'backend', 'data', 'site_corpus.txt');
  return fs.existsSync(corpusPath) ? fs.readFileSync(corpusPath, 'utf8') : '';
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

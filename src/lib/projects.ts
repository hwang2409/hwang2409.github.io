import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { markdownToHtml } from '@/lib/blog';

export interface Project {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  order: number;
  content: string;
}

export interface RenderedProject extends Project {
  htmlContent: string;
}

function parseDate(value: Date | string | number | null | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? '');
  return Number.isNaN(date.getTime())
    ? String(value || '')
    : [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      ]
        .map((part) => String(part).padStart(2, '0'))
        .join('-');
}

function readProject(slug: string): Project | null {
  try {
    const filePath = path.join(process.cwd(), 'content', 'projects', `${slug}.md`);

    if (!fs.existsSync(filePath)) return null;

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    return {
      slug,
      title: String(data.title || ''),
      date: parseDate(data.date),
      excerpt: String(data.excerpt || ''),
      order: Number(data.order || 0),
      content: content.trim(),
    };
  } catch (error) {
    console.error(`Error reading project ${slug}:`, error);
    return null;
  }
}

export function getProjects(): Project[] {
  const projectsDir = path.join(process.cwd(), 'content', 'projects');

  if (!fs.existsSync(projectsDir)) return [];

  return fs
    .readdirSync(projectsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => readProject(file.replace(/\.md$/u, '')))
    .filter((project): project is Project => project !== null)
    .sort((a, b) => a.order - b.order);
}

export async function getProject(slug: string): Promise<RenderedProject | null> {
  const project = readProject(slug);
  if (!project) return null;

  return {
    ...project,
    htmlContent: await markdownToHtml(project.content, { slug: project.slug }),
  };
}

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface Project {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  order: number;
  content: string;
}

function invalidMetadata(filePath: string, message: string): never {
  throw new Error(`Invalid project metadata in ${filePath}: ${message}`);
}

function parseRequiredText(
  value: string | null | undefined,
  field: string,
  filePath: string
) {
  if (typeof value !== 'string' || value.trim() === '') {
    invalidMetadata(filePath, `${field} must be a non-empty string`);
  }

  return value.trim();
}

function parseDate(value: string | null | undefined, filePath: string) {
  if (typeof value !== 'string') {
    invalidMetadata(filePath, 'date must use MM/DD/YYYY');
  }

  const parts = value.split('/');
  if (
    parts.length !== 3 ||
    parts[0].length !== 2 ||
    parts[1].length !== 2 ||
    parts[2].length !== 4 ||
    parts.some((part) => !/^\d+$/u.test(part))
  ) {
    invalidMetadata(filePath, 'date must use MM/DD/YYYY');
  }

  const month = Number(parts[0]);
  const day = Number(parts[1]);
  const year = Number(parts[2]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    invalidMetadata(filePath, 'date must be a valid MM/DD/YYYY date');
  }

  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    invalidMetadata(filePath, 'date must be a valid MM/DD/YYYY date');
  }

  return [year, month, day]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
}

function readProject(slug: string): Project | null {
  const filePath = path.join(process.cwd(), 'content', 'projects', `${slug}.md`);

  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  const title = parseRequiredText(data.title, 'title', filePath);
  const excerpt = parseRequiredText(data.excerpt, 'excerpt', filePath);
  const date = parseDate(data.date, filePath);

  if (typeof data.order !== 'number' || !Number.isFinite(data.order)) {
    invalidMetadata(filePath, 'order must be a finite number');
  }

  const order = data.order;

  return {
    slug,
    title,
    date,
    excerpt,
    order,
    content: content.trim(),
  };
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

export function getProject(slug: string): Project | null {
  return readProject(slug);
}

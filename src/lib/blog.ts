import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  kind: string;
  readingMinutes: number;
  content: string;
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

    const words = content.trim().split(/\s+/).filter(Boolean).length;

    return {
      slug,
      title: data.title || '',
      date: dateStr,
      excerpt: data.excerpt || '',
      kind: data.kind || 'note',
      readingMinutes: Math.max(1, Math.round(words / 220)),
      content: content.trim(),
    };
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error);
    return null;
  }
}

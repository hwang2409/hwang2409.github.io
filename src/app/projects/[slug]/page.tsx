import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProject, getProjects } from '@/lib/projects';
import { markdownToHtml } from '@/lib/markdown';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return { title: project.title };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) notFound();
  const htmlContent = await markdownToHtml(project.content, { slug: project.slug });

  return (
    <article className="post-article">
      <header className="post-header">
        <h1 className="post-title">{project.title}</h1>
        <time className="post-date" dateTime={project.date}>
          {new Date(project.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
      </header>

      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </article>
  );
}

export function generateStaticParams() {
  return getProjects().map((project) => ({
    slug: project.slug,
  }));
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProject, getProjects } from '@/lib/projects';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  return { title: project.title };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) notFound();

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
        dangerouslySetInnerHTML={{ __html: project.htmlContent }}
      />
    </article>
  );
}

export function generateStaticParams() {
  return getProjects().map((project) => ({
    slug: project.slug,
  }));
}

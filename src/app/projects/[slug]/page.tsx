import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject, getProjects } from '@/lib/projects';
import { markdownToHtmlWithSections } from '@/lib/markdown';
import Contents from '@/components/Contents';

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
  const { html: htmlContent, sections } = await markdownToHtmlWithSections(project.content, { slug: project.slug });

  return (
    <>
    <article className="post-article project-article">
      <h1 className="post-title page-title">{project.title}</h1>
      <p className="post-meta">{project.date}</p>
      <p className="post-excerpt">{project.excerpt}</p>
      <Contents sections={sections} />
      <div className="prose" dangerouslySetInnerHTML={{ __html: htmlContent }} />
      <nav className="post-pager" aria-label="project navigation"><Link href="/projects">all projects</Link></nav>
    </article>
    </>
  );
}

export function generateStaticParams() {
  return getProjects().map((project) => ({
    slug: project.slug,
  }));
}

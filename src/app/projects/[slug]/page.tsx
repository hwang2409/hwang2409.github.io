import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject, getProjects } from '@/lib/projects';
import { markdownToHtmlWithSections } from '@/lib/markdown';
import ManualChrome from '@/components/ManualChrome';
import ManualContents from '@/components/ManualContents';

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
    <ManualChrome name="HENRY-PROJECTS(7)" title="Miscellaneous Manual" status="henry-projects(7)" currentSection="projects" sectionHref="/projects" />
    <article className="post-article project-article">
      <h1 className="post-title page-title">{project.title}</h1>
      <section className="man-section"><h2>NAME</h2><p className="man-indent"><strong>{project.title}</strong> — {project.excerpt}</p></section>
      <ManualContents sections={sections} />
      <section className="man-section"><h2>SYNOPSIS</h2><p className="man-indent"><strong>{project.title.toLowerCase().replaceAll(' ', '-')}</strong> — {project.excerpt}</p></section>
      <section className="man-section"><h2>DESCRIPTION</h2><div className="man-indent prose" dangerouslySetInnerHTML={{ __html: htmlContent }} /></section>
      <section className="man-section"><h2>HISTORY</h2><p className="man-indent">published {project.date}; work continues in public.</p></section>
      <section className="man-section"><h2>SEE ALSO</h2><p className="man-indent"><Link href="/projects">henry-projects(7)</Link>, <a href="https://github.com/hwang2409" target="_blank" rel="noopener noreferrer">github(1)</a></p></section>
    </article>
    </>
  );
}

export function generateStaticParams() {
  return getProjects().map((project) => ({
    slug: project.slug,
  }));
}

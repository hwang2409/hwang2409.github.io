import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPost } from '@/lib/blog';
import { getProject, getProjects } from '@/lib/projects';
import { markdownToHtmlWithSections } from '@/lib/markdown';
import Contents from '@/components/Contents';
import LightboxImageTrigger from '@/components/LightboxImageTrigger';
import ProjectWidget, { type ProjectWidgetName } from '@/components/project-widgets/ProjectWidget';
import { formatDate } from '@/lib/dates';

const widgetMarker = /<!--\s*widget:\s*(integrators|timestep|spring|pendulum-tree|solver-iterations|friction-cone|determinism-replay)\s*-->/gu;

function ProjectContent({ html }: { html: string }) {
  const blocks: Array<{ html: string } | { widget: ProjectWidgetName }> = [];
  let lastIndex = 0;

  for (const match of html.matchAll(widgetMarker)) {
    if (match.index > lastIndex) blocks.push({ html: html.slice(lastIndex, match.index) });
    const widget = match[1];
    if (widget === 'integrators' || widget === 'timestep' || widget === 'spring' || widget === 'pendulum-tree' || widget === 'solver-iterations' || widget === 'friction-cone' || widget === 'determinism-replay') {
      blocks.push({ widget });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) blocks.push({ html: html.slice(lastIndex) });

  return (
    <div className="prose project-prose">
      {blocks.map((block, index) => (
        'widget' in block ? <ProjectWidget key={`${block.widget}-${index}`} name={block.widget} /> : (
          <div key={`prose-${index}`} dangerouslySetInnerHTML={{ __html: block.html }} />
        )
      ))}
    </div>
  );
}

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
  const blogPost = project.blog ? getBlogPost(project.blog) : null;

  return (
    <>
    <article className="post-article project-article">
      <h1 className="post-title page-title">{project.title}</h1>
      <p className="post-meta"><time dateTime={formatDate(project.date)}>{formatDate(project.date)}</time></p>
      <p className="post-excerpt">{project.excerpt}</p>
      <LightboxImageTrigger
        src={project.image}
        alt={project.imageAlt}
        width={project.imageWidth}
        height={project.imageHeight}
        className="project-hero"
        loading="eager"
      />
      <Contents sections={sections} />
      <ProjectContent html={htmlContent} />
      {blogPost ? (
        <p className="project-blog-link">
          for more information, read <Link href={`/blog/${blogPost.slug}`}>{blogPost.title}</Link> -&gt;
        </p>
      ) : null}
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

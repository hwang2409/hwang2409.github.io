import Link from 'next/link';
import { getProjects } from '@/lib/projects';
import ManualChrome from '@/components/ManualChrome';

export const metadata = {
  title: 'projects',
};

export default function Projects() {
  const projects = getProjects();

  return (
    <>
    <ManualChrome name="HENRY-PROJECTS(7)" title="Miscellaneous Manual" status="henry-projects(7) — 3 write-ups" />
    <section className="man-section page-section">
      <h1 className="page-title">APROPOS HENRY</h1>
      <ul className="post-list project-list">
        {projects.map((project) => (
          <li key={project.slug}>
            <Link href={`/projects/${project.slug}`} className="post-link">
              <span className="post-link-title"><strong>{project.title}</strong>(7)</span> — <span className="post-excerpt">{project.excerpt}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
    </>
  );
}

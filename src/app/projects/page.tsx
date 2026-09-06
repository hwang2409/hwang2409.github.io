import Link from 'next/link';
import { getProjects } from '@/lib/projects';

export const metadata = {
  title: 'projects',
};

export default function Projects() {
  const projects = getProjects();

  return (
    <>
    <section className="page-section">
      <h1 className="page-title">projects</h1>
      <ul className="project-list">
        {projects.map((project) => (
          <li key={project.slug}>
            <Link href={`/projects/${project.slug}`} className="post-link">
              <strong className="post-link-title">{project.title}</strong> <span>{project.excerpt}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
    </>
  );
}

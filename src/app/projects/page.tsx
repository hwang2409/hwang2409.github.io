import Link from 'next/link';
import { getProjects } from '@/lib/projects';

export const metadata = {
  title: 'projects',
};

export default function Projects() {
  const projects = getProjects();

  return (
    <section>
      <h1 className="page-title">projects</h1>
      <p className="page-note">selected projects and experiments</p>

      <ul className="post-list project-list">
        {projects.map((project) => (
          <li key={project.slug}>
            <Link href={`/projects/${project.slug}`} className="post-link">
              <span className="post-link-title">{project.title}</span>
              <span className="post-excerpt">{project.excerpt}</span>
              <time className="post-date" dateTime={project.date}>
                {new Date(project.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

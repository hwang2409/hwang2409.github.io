import Link from 'next/link';
import { getProjects } from '@/lib/projects';
import ProjectImage from '@/components/ProjectImage';

export const metadata = {
  title: 'projects',
};

export default function Projects() {
  const projects = getProjects();

  return (
    <>
    <section className="page-section">
      <h1 className="page-title">projects</h1>
      <ul className="project-gallery">
        {projects.map((project) => (
          <li key={project.slug}>
            <Link href={`/projects/${project.slug}`} className="project-entry">
              <ProjectImage project={project} className="project-entry-image" />
              <span className="project-entry-copy">
                <strong>{project.title}</strong>
                <span>{project.excerpt}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
    </>
  );
}

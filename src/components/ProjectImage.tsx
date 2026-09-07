import type { Project } from '@/lib/projects';

export default function ProjectImage({
  project,
  className,
}: {
  project: Project;
  className: string;
}) {
  if (!project.image) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- project images use validated public paths.
    <img
      className={className}
      src={project.image}
      alt={`${project.title}: ${project.excerpt}`}
    />
  );
}

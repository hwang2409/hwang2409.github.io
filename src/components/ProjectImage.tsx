import type { Project } from '@/lib/projects';

export default function ProjectImage({
  project,
  className,
  loading,
}: {
  project: Project;
  className: string;
  loading: 'eager' | 'lazy';
}) {
  if (!project.image) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- project images use validated public paths.
    <img
      className={className}
      src={project.image}
      alt={project.imageAlt}
      width={project.imageWidth}
      height={project.imageHeight}
      loading={loading}
      decoding="async"
    />
  );
}

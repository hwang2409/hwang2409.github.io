'use client';

export default function LightboxImageTrigger({
  src,
  alt,
  width,
  height,
  className,
  loading,
}: {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  className: string;
  loading: 'eager' | 'lazy';
}) {
  if (!src) return null;

  return (
    <button
      className="lightbox-trigger lightbox-image-trigger lightbox-project-trigger"
      type="button"
      data-lightbox-trigger="image"
      aria-label={alt ? `expand image: ${alt}` : 'expand image'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- project images use validated public paths. */}
      <img
        className={className}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
      />
    </button>
  );
}

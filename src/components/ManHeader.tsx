import Link from 'next/link';

type ManualHeader = {
  readonly name: string;
  readonly title: string;
  readonly sectionHref?: string;
};

export default function ManHeader({ name, title, sectionHref }: ManualHeader) {
  const nameField = sectionHref ? (
    <Link href={sectionHref} className="man-header-link">{name}</Link>
  ) : (
    <span>{name}</span>
  );

  return (
    <div className="man-header" aria-label={`${name} manual page`}>
      {nameField}
      <span className="man-header-title">{title}</span>
      <span className="man-header-right">{sectionHref ? (
        <Link href={sectionHref} className="man-header-link">{name}</Link>
      ) : nameField}</span>
    </div>
  );
}

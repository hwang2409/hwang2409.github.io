import Link from 'next/link';

export type SiteSection =
  | 'home'
  | 'blog'
  | 'projects'
  | 'music'
  | 'lab'
  | 'now'
  | 'resume';

export type NavigationItem = {
  readonly key: Exclude<SiteSection, 'home'>;
  readonly label: string;
  readonly href: string;
};

export const navigationItems: readonly NavigationItem[] = [
  { key: 'blog', label: 'blog', href: '/blog' },
  { key: 'projects', label: 'projects', href: '/projects' },
  { key: 'music', label: 'music', href: '/music' },
  { key: 'lab', label: 'lab', href: '/lab' },
  { key: 'now', label: 'now', href: '/now' },
  { key: 'resume', label: 'resume', href: '/resume' },
];

function NavigationItemView({
  item,
  currentSection,
}: {
  readonly item: NavigationItem;
  readonly currentSection: SiteSection;
}) {
  const current = item.key === currentSection;
  const label = current ? (
    <strong className="man-nav-current" aria-current="page">
      {item.label}
    </strong>
  ) : (
    <Link href={item.href}>{item.label}</Link>
  );

  return (
    <span className="man-nav-item">
      <span className="man-nav-bracket" aria-hidden="true">[</span>
      {label}
      <span className="man-nav-bracket" aria-hidden="true">]</span>
    </span>
  );
}

export default function ManNav({ currentSection }: { readonly currentSection: SiteSection }) {
  const homeLabel = currentSection === 'home' ? (
    <strong className="man-nav-current" aria-current="page">henry</strong>
  ) : (
    <Link href="/">henry</Link>
  );

  return (
    <nav className="man-nav" aria-label="site">
      <span className="man-nav-prefix">{homeLabel}</span>
      {navigationItems.map((item) => (
        <NavigationItemView
          key={item.key}
          item={item}
          currentSection={currentSection}
        />
      ))}
    </nav>
  );
}

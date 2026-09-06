'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationItems = [
  { label: 'blog', href: '/blog', section: 'blog' },
  { label: 'projects', href: '/projects', section: 'projects' },
  { label: 'music', href: '/music', section: 'music' },
  { label: 'lab', href: '/lab', section: 'lab' },
  { label: 'now', href: '/now', section: 'now' },
  { label: 'resume', href: '/resume', section: 'resume' },
] as const;

function currentSection(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/u, '') || '/';
  if (normalizedPath === '/') return 'home';
  if (normalizedPath === '/labs' || normalizedPath.startsWith('/lab/')) return 'lab';
  const item = navigationItems.find(({ href }) => normalizedPath === href || normalizedPath.startsWith(`${href}/`));
  return item?.section;
}

export default function SiteNav() {
  const pathname = usePathname();
  const section = currentSection(pathname);

  return (
    <header className="site-header">
      <Link href="/" className="site-name" aria-current={section === 'home' ? 'page' : undefined}>henry wang</Link>
      <nav className="site-nav" aria-label="site">
        {navigationItems.map((item) => (
          item.section === section ? (
            <span className="site-nav-current" aria-current="page" key={item.href}>{item.label}</span>
          ) : (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          )
        ))}
      </nav>
    </header>
  );
}

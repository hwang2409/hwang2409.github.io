'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// /resume stays a live route, shared by URL only; it is intentionally absent here
const navigationItems = [
  { label: 'blog', href: '/blog', section: 'blog' },
  { label: 'projects', href: '/projects', section: 'projects' },
  { label: 'music', href: '/music', section: 'music' },
  { label: 'now', href: '/now', section: 'now' },
] as const;

function currentSection(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/u, '') || '/';
  if (normalizedPath === '/') return 'home';
  const item = navigationItems.find(({ href }) => normalizedPath === href || normalizedPath.startsWith(`${href}/`));
  return item?.section;
}

export default function SiteNav() {
  const pathname = usePathname();
  const section = currentSection(pathname);

  return (
    <header className="site-header">
      {section !== 'home' && <Link href="/" className="site-name">henry wang</Link>}
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

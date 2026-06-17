'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const links = [
  { href: '/blog', label: 'blog' },
  { href: '/lab', label: 'lab', aliases: ['/labs'] },
  { href: '/resume', label: 'resume' },
];

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActivePath(pathname: string, link: (typeof links)[number]) {
  return [link.href, ...(link.aliases || [])].some((href) => pathMatches(pathname, href));
}

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Main">
      {links.map((link) => {
        const active = isActivePath(pathname, link);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? 'nav-active' : undefined}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}
      <ThemeToggle />
    </nav>
  );
}

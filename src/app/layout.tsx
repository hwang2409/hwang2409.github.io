import type { Metadata } from 'next';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Henry Wang',
    template: '%s | Henry Wang',
  },
  description:
    'Software engineering student at the University of Waterloo.',
};

const themeScript = `
try {
  var theme = window.localStorage.getItem('theme');
  if (theme === 'dark' || theme === 'light') {
    document.documentElement.dataset.theme = theme;
  }
  var blogCase = window.localStorage.getItem('blog-case');
  if (blogCase === 'lower') {
    document.documentElement.dataset.blogCase = blogCase;
  }
} catch (_) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <div className="site-shell">
          <header className="site-header">
            <Link href="/" className="site-name">
              Henry Wang
            </Link>
            <SiteNav />
          </header>

          <main className="site-main">{children}</main>

          <footer className="site-footer">
            <span>hw</span>
            <div className="site-links">
              <a href="mailto:h352wang@uwaterloo.ca">email</a>
              <a
                href="https://github.com/hwang2409"
                target="_blank"
                rel="noopener noreferrer"
              >
                github
              </a>
              <a
                href="https://linkedin.com/in/henry-w-se"
                target="_blank"
                rel="noopener noreferrer"
              >
                linkedin
              </a>
              <a
                href="https://x.com/oreaooaoaoaoa"
                target="_blank"
                rel="noopener noreferrer"
              >
                x
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

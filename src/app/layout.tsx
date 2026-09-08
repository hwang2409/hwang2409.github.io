import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import SiteNav from '@/components/SiteNav';
import './globals.css';

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Henry Wang',
    template: '%s | Henry Wang',
  },
  description:
    'Building thingamajigs.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetBrainsMono.variable}>
      <body>
        <a href="#main-content" className="skip-link">skip to content</a>
        <div className="site-shell">
          <SiteNav />
          <main id="main-content" className="site-main">{children}</main>

          <footer className="site-footer">
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
            <span className="site-copyright">building thingamajigs</span>
          </footer>
        </div>
      </body>
    </html>
  );
}

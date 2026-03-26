import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import ParticleCanvas from '@/components/ParticleCanvas';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Henry Wang',
    template: '%s | Henry Wang',
  },
  description:
    'Software engineering student at the University of Waterloo.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.className} antialiased`}>
        <ParticleCanvas />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import MusicPageClient from '@/components/MusicPageClient';

export const metadata: Metadata = {
  title: 'music',
};

export default function MusicPage() {
  return <MusicPageClient />;
}

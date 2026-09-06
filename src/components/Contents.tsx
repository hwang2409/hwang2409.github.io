import Link from 'next/link';
import type { MarkdownSection } from '@/lib/markdown';

export default function Contents({
  sections,
}: {
  readonly sections: readonly MarkdownSection[];
}) {
  if (sections.length < 3) return null;

  return (
    <nav className="contents" aria-labelledby="contents-title">
      <h2 id="contents-title">contents</h2>
      <ol>
        {sections.map((section) => (
          <li key={section.id}><Link href={`#${section.id}`}>{section.title}</Link></li>
        ))}
      </ol>
    </nav>
  );
}

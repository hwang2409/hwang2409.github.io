import Link from 'next/link';
import type { MarkdownSection } from '@/lib/markdown';

export default function ManualContents({
  sections,
}: {
  readonly sections: readonly MarkdownSection[];
}) {
  if (sections.length < 3) return null;

  return (
    <section className="man-section manual-contents" aria-labelledby="contents-title">
      <h2 id="contents-title">CONTENTS</h2>
      <dl className="tag-list contents-list">
        {sections.map((section, index) => (
          <div key={section.id}>
            <dt>{String(index + 1).padStart(2, '0')}</dt>
            <dd><Link href={`#${section.id}`}>{section.title}</Link></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

import ManHeader from '@/components/ManHeader';
import ManNav, { type SiteSection } from '@/components/ManNav';
import StatusLine from '@/components/StatusLine';

export default function ManualChrome({
  name,
  title,
  status,
  currentSection,
  sectionHref,
}: {
  readonly name: string;
  readonly title: string;
  readonly status: string;
  readonly currentSection: SiteSection;
  readonly sectionHref?: string;
}) {
  return (
    <>
      <ManHeader name={name} title={title} sectionHref={sectionHref} />
      <ManNav currentSection={currentSection} />
      <StatusLine label={status} />
    </>
  );
}

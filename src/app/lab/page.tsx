import LabConsole from '@/components/LabConsole';

export const metadata = {
  title: 'lab',
};

export default function LabPage() {
  return (
    <section>
      <h1 className="page-title">lab</h1>
      <p className="page-note">small live systems attached to the static site</p>
      <LabConsole />
    </section>
  );
}

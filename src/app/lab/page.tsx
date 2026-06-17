import LabConsole from '@/components/LabConsole';

export const metadata = {
  title: 'lab',
};

export default function LabPage() {
  return (
    <section className="lab-page">
      <div className="lab-page-header">
        <h1 className="page-title">lab</h1>
        <p className="page-note">small live systems attached to the static site</p>
      </div>
      <LabConsole />
    </section>
  );
}

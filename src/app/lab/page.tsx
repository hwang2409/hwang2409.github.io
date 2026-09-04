import LabConsole from '@/components/LabConsole';
import { getSearchDocuments } from '@/lib/siteData';
import ManualChrome from '@/components/ManualChrome';

export const metadata = {
  title: 'lab',
};

export default function LabPage() {
  const searchDocuments = getSearchDocuments();

  return (
    <>
    <ManualChrome name="HENRY-LAB(8)" title="System Administration Manual" status="henry-lab(8) — 2 models loaded — runs locally" />
    <section className="lab-page">
      <div className="lab-page-header">
        <h1 className="page-title">EXAMPLES</h1>
        <p className="man-indent page-note">small checks for local models, search, and backend health</p>
      </div>
      <LabConsole searchDocuments={searchDocuments} />
    </section>
    </>
  );
}

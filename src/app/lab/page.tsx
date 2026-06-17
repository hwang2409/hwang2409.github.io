import LabConsole from '@/components/LabConsole';
import { getSearchDocuments } from '@/lib/siteData';

export const metadata = {
  title: 'lab',
};

export default function LabPage() {
  const searchDocuments = getSearchDocuments();

  return (
    <section className="lab-page">
      <div className="lab-page-header">
        <h1 className="page-title">lab</h1>
        <p className="page-note">small checks for local models, search, and backend health</p>
      </div>
      <LabConsole searchDocuments={searchDocuments} />
    </section>
  );
}

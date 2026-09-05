import { markdownToHtml } from '@/lib/markdown';
import { getNowLog } from '@/lib/now';
import ManualChrome from '@/components/ManualChrome';

export const metadata = {
  title: 'now',
};

export default async function Now() {
  const nowLog = getNowLog();
  const entries = await Promise.all(
    nowLog.entries.map(async (entry) => ({
      ...entry,
      html: await markdownToHtml(entry.content),
    }))
  );

  return (
    <>
    <ManualChrome name="HENRY-NOW(5)" title="File Formats Manual" status="henry-now(5) — last modified 2026-07-31" currentSection="now" sectionHref="/now" />
    <section className="now-page page-section">
      <h1 className="page-title">ENTRIES</h1>
      <p className="man-indent page-note">{nowLog.note}</p>

      <ol className="now-timeline" aria-label="current notes over time">
        {entries.map((entry) => (
          <li className="now-entry" key={`${entry.date}-${entry.category}`}>
            <time className="now-date">{entry.date}</time>
            <div className="now-copy">
              <span className="now-category">{entry.category}</span>
              <div
                className="now-body"
                dangerouslySetInnerHTML={{ __html: entry.html }}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
    </>
  );
}

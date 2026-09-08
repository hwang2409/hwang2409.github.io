import { markdownToHtml } from '@/lib/markdown';
import { getNowLog } from '@/lib/now';
import { formatDate } from '@/lib/dates';

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
    <section className="now-page page-section">
      <h1 className="page-title">now</h1>
      <p className="page-note">{nowLog.note}</p>

      <ol className="now-timeline" aria-label="current notes over time">
        {entries.map((entry) => (
          <li className="now-entry" key={`${entry.date}-${entry.category}`}>
            <time className="now-date" dateTime={formatDate(entry.date)}>{formatDate(entry.date)}</time>
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

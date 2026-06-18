import { markdownToHtml } from '@/lib/blog';
import { getNowLog } from '@/lib/now';

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
    <section className="now-page">
      <h1 className="page-title">now</h1>
      <p className="page-note">{nowLog.note}</p>

      <ol className="now-timeline" aria-label="current notes over time">
        {entries.map((entry) => (
          <li className="now-entry" key={`${entry.date}-${entry.category}`}>
            <time className="now-date">{entry.date}</time>
            <span className="now-pin" aria-hidden="true" />
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
  );
}

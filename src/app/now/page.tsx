export const metadata = {
  title: 'now',
};

const nowEntries = [
  {
    date: 'june 17, 2026',
    category: 'site',
    body: 'turning /now into an append-only log instead of a fixed status page.',
  },
  {
    date: 'june 2026',
    category: 'lab',
    body: 'keeping the site mostly static, with small local experiments attached where they make sense.',
  },
  {
    date: 'may 2026',
    category: 'models',
    body: 'thinking about browser-side models, local-first tools, and demos that avoid external API calls.',
  },
  {
    date: 'april 2026',
    category: 'writing',
    body: 'editing posts down into technical notes, with margin comments for the parts that need extra context.',
  },
  {
    date: 'march 2026',
    category: 'systems',
    body: 'working through cuda, ml training loops, and small pieces of infrastructure I can explain clearly.',
  },
  {
    date: 'spring 2026',
    category: 'offline',
    body: 'snowboarding when possible, music, and keeping personal tools small.',
  },
];

export default function Now() {
  return (
    <section className="now-page">
      <h1 className="page-title">now</h1>
      <p className="page-note">append-only notes, latest first</p>

      <ol className="now-timeline" aria-label="current notes over time">
        {nowEntries.map((entry) => (
          <li className="now-entry" key={`${entry.date}-${entry.category}`}>
            <time className="now-date">{entry.date}</time>
            <span className="now-pin" aria-hidden="true" />
            <div className="now-copy">
              <span className="now-category">{entry.category}</span>
              <p className="now-body">{entry.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

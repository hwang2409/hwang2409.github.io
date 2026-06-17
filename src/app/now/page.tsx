export const metadata = {
  title: 'now',
};

const nowEntries = [
  {
    date: 'june 17, 2026',
    category: 'personal',
    body: 'ive recently found the time to start working on personal projects again. cool things incoming!'
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

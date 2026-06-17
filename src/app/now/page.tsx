export const metadata = {
  title: 'now',
};

export default function Now() {
  return (
    <section className="now-page">
      <h1 className="page-title">now</h1>
      <p className="page-note">updated june 17, 2026</p>

      <dl className="details now-list">
        <div>
          <dt>building</dt>
          <dd>
            this site as a small technical notebook, with static writing and a few live
            experiments attached.
          </dd>
        </div>

        <div>
          <dt>thinking</dt>
          <dd>
            browser-side models, local-first tools, and ways to make writing show its
            underlying context without adding clutter.
          </dd>
        </div>

        <div>
          <dt>reading</dt>
          <dd>
            gpu programming notes, rendering systems, and retrieval/search papers.
          </dd>
        </div>

        <div>
          <dt>offline</dt>
          <dd>snowboarding when possible, music, and keeping tools small.</dd>
        </div>
      </dl>
    </section>
  );
}

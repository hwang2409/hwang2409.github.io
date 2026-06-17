export default function Home() {
  return (
    <section className="intro">
      <p className="intro-statement">
        software engineer at uwaterloo, interested in ML systems, computer graphics,
        and small technical tools.
      </p>

      <dl className="details">
        <div>
          <dt>currently</dt>
          <dd>
            engineering @{' '}
            <a href="https://phoebe.work/" target="_blank" rel="noopener noreferrer">
              phoebe.work
            </a>
          </dd>
        </div>

        <div>
          <dt>previously</dt>
          <dd>
            SWE @{' '}
            <a href="https://fish.audio" target="_blank" rel="noopener noreferrer">
              fish.audio
            </a>
            , NationGraph
          </dd>
        </div>

        <div>
          <dt>interests</dt>
          <dd>ML, computer graphics, game theory</dd>
        </div>

        <div>
          <dt>also</dt>
          <dd>snowboarding, music</dd>
        </div>
      </dl>
    </section>
  );
}

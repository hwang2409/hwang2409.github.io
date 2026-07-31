import PixelMascot from '@/components/PixelMascot';
import SpotifyNow from '@/components/SpotifyNow';

export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="hero-statement">
          henry wang <em>— software engineer</em>
        </p>
        <PixelMascot />
      </section>

      <section className="home-section" aria-labelledby="about-title">
        <h2 className="page-title" id="about-title">
          about
        </h2>

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
              ,{' '}
              <a
                href="https://www.nationgraph.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                nationgraph
              </a>
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

      <div className="home-section">
        <SpotifyNow />
      </div>
    </>
  );
}

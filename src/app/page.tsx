import PixelMascot from '@/components/PixelMascot';
import SpotifyNow from '@/components/SpotifyNow';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <section className="home-intro" aria-labelledby="home-name">
        <h1 id="home-name">henry wang</h1>
        <p>swe @ uwaterloo, currently working on agents at <a href="https://phoebe.work/" target="_blank" rel="noopener noreferrer">phoebe</a>; previously worked at <a href="https://fish.audio" target="_blank" rel="noopener noreferrer">fish audio</a> and <a href="https://www.nationgraph.com/" target="_blank" rel="noopener noreferrer">nationgraph</a>.</p>
      </section>

      <section className="home-section" aria-labelledby="projects-title">
        <h2 id="projects-title">projects</h2>
        <ul className="project-list home-projects">
          <li><Link href="/projects/wiki">wiki</Link><span>my agent workspace</span></li>
          <li><Link href="/projects/zeta">zeta</Link><span>working on a harness that owns the loop</span></li>
          <li><Link href="/projects/newt-chimy2">newt+chimy2</Link><span>deterministic physics engine and software renderer</span></li>
        </ul>
      </section>

      <section className="home-section home-mascot" aria-label="pixel mascot">
        <PixelMascot />
      </section>

      <section className="home-section" aria-label="music">
        <SpotifyNow />
      </section>


    </>
  );
}

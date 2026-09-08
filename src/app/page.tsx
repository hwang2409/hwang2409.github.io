import PixelMascot from '@/components/PixelMascot';
import SpotifyNow from '@/components/SpotifyNow';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <section className="home-intro" aria-labelledby="home-name">
        <h1 id="home-name">henry wang</h1>
        <p className="home-role">software engineer</p>
        <p>software engineer at uwaterloo, interested in ML systems, computer graphics, and small technical tools. currently engineering at <a href="https://phoebe.work/" target="_blank" rel="noopener noreferrer">phoebe.work</a>; previously <a href="https://fish.audio" target="_blank" rel="noopener noreferrer">fish.audio</a> and <a href="https://www.nationgraph.com/" target="_blank" rel="noopener noreferrer">nationgraph</a>.</p>
      </section>

      <section className="home-section" aria-labelledby="projects-title">
        <h2 id="projects-title">projects</h2>
        <ul className="project-list home-projects">
          <li><Link href="/projects/wiki">wiki</Link><span>a local markdown vault and agent workspace</span></li>
          <li><Link href="/projects/zeta">zeta</Link><span>an agent harness that owns the loop</span></li>
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

import PixelMascot from '@/components/PixelMascot';
import SpotifyNow from '@/components/SpotifyNow';
import Link from 'next/link';
import ManualChrome from '@/components/ManualChrome';

export default function Home() {
  return (
    <>
      <ManualChrome name="HENRY(1)" title="General Commands Manual" status="Manual page henry(1)" />
      <h1 className="page-title home-title">henry wang</h1>
      <section className="man-section home-hero" aria-labelledby="home-name">
        <h2>NAME</h2>
        <p className="man-indent" id="home-name"><strong>henry wang</strong> — software engineer</p>
      </section>

      <section className="man-section" aria-labelledby="synopsis-title">
        <h2 id="synopsis-title">SYNOPSIS</h2>
        <p className="man-indent"><strong>henry</strong> [<Link href="/blog">blog</Link>] [<Link href="/projects">projects</Link>] [<Link href="/music">music</Link>] [<Link href="/lab">lab</Link>] [<Link href="/now">now</Link>] [<Link href="/resume">resume</Link>]</p>
      </section>

      <section className="man-section" aria-labelledby="description-title">
        <h2 id="description-title">DESCRIPTION</h2>
        <p className="man-indent">software engineer at uwaterloo, interested in ML systems, computer graphics, and small technical tools. currently engineering at <a href="https://phoebe.work/" target="_blank" rel="noopener noreferrer">phoebe.work</a>; previously <a href="https://fish.audio" target="_blank" rel="noopener noreferrer">fish.audio</a> and <a href="https://www.nationgraph.com/" target="_blank" rel="noopener noreferrer">nationgraph</a>.</p>
        <dl className="tag-list">
          <div><dt>--interests</dt><dd>ML, computer graphics, game theory</dd></div>
          <div><dt>--also</dt><dd>snowboarding, music</dd></div>
        </dl>
      </section>

      <section className="man-section" aria-labelledby="projects-title">
        <h2 id="projects-title">PROJECTS</h2>
        <dl className="tag-list">
          <div><dt><Link href="/projects/wiki">wiki</Link></dt><dd>a local markdown vault and agent workspace</dd></div>
          <div><dt><Link href="/projects/zeta">zeta</Link></dt><dd>an agent harness that owns the loop</dd></div>
          <div><dt><Link href="/projects/newt-chimy2">newt+chimy2</Link></dt><dd>deterministic physics engine and software renderer</dd></div>
        </dl>
      </section>

      <section className="man-section home-examples" aria-labelledby="examples-title">
        <h2 id="examples-title">EXAMPLES</h2>
        <div className="man-indent"><PixelMascot /><p className="fine-print">fig. 1 — the author, descending</p></div>
      </section>

      <section className="man-section home-music" aria-labelledby="music-title">
        <h2 id="music-title">MUSIC</h2>
        <div className="man-indent"><SpotifyNow /></div>
      </section>

      <section className="man-section" aria-labelledby="see-also-title">
        <h2 id="see-also-title">SEE ALSO</h2>
        <p className="man-indent"><a href="https://github.com/hwang2409" target="_blank" rel="noopener noreferrer">github(1)</a>, <a href="mailto:h352wang@uwaterloo.ca">mail(1)</a>, <Link href="/music">spotify(7)</Link></p>
      </section>

      <section className="man-section" aria-labelledby="colophon-title">
        <h2 id="colophon-title">COLOPHON</h2>
        <p className="man-indent fine-print">© 2026 henry wang. this page is intentionally quiet.</p>
      </section>
    </>
  );
}

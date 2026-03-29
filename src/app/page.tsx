import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <header className="w-full max-w-5xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between text-sm">
        <Link href="/" className="logo text-foreground font-semibold">
          hw.
        </Link>
        <nav className="flex gap-5">
          <Link
            href="/blog"
            className="nav-link text-muted hover:text-foreground transition-colors duration-200"
          >
            blog
          </Link>
          <Link
            href="/resume"
            className="nav-link text-muted hover:text-foreground transition-colors duration-200"
          >
            resume
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center">
        <div className="w-full max-w-5xl mx-auto px-6">
          <h1 className="text-2xl font-semibold text-foreground mb-3 stagger-1">
            Henry Wang
          </h1>

          <p className="text-sm text-muted mb-8 stagger-2 cursor-blink">
            swe @ uwaterloo
          </p>

          <div className="space-y-4 text-sm">
            <div className="info-line stagger-3">
              <span className="bracket-label text-accent cursor-default">[currently]</span>{' '}
              <span className="text-muted">SWE @ </span>
              <a
                href="https://fish.audio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-accent transition-colors duration-200"
              >
                fish.audio
              </a>
            </div>

            <div className="info-line stagger-4">
              <span className="bracket-label text-accent cursor-default">[previously]</span>{' '}
              <span className="text-muted">SWE @ </span>
              <span className="text-foreground">NationGraph</span>
            </div>

            <div className="info-line stagger-5">
              <span className="bracket-label text-accent cursor-default">[interests]</span>{' '}
              <span className="text-muted">
                ML, computer graphics, game theory
              </span>
            </div>

            <div className="info-line stagger-6">
              <span className="bracket-label text-accent cursor-default">[also]</span>{' '}
              <span className="text-muted">snowboarding, music</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer-sep w-full max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-muted stagger-8">
        <span className="text-muted/40">hw.</span>
        <div className="flex gap-5">
          <a
            href="mailto:h352wang@uwaterloo.ca"
            className="nav-link hover:text-foreground transition-colors duration-200"
          >
            email
          </a>
          <a
            href="https://github.com/hwang2409"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link hover:text-foreground transition-colors duration-200"
          >
            github
          </a>
          <a
            href="https://linkedin.com/in/henry-w-se"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link hover:text-foreground transition-colors duration-200"
          >
            linkedin
          </a>
          <a
            href="https://x.com/oreaooaoaoaoa"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link hover:text-foreground transition-colors duration-200"
          >
            x
          </a>
        </div>
      </footer>
    </div>
  );
}

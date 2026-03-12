import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
      <div className="panel w-full max-w-lg">
        <h1 className="mono text-4xl md:text-5xl font-bold text-accent mb-4 tracking-tight">
          Henry Wang
        </h1>

        <p className="mono text-muted text-sm mb-8">
          {'>'} swe @ uwaterloo
        </p>

        <p className="text-sm leading-relaxed mb-8 max-w-sm" style={{ color: '#888' }}>
	      full stack SWE interested in ML, computer graphics, game theory.
		</p>

        <p className="text-sm leading-relaxed mb-8 max-w-sm" style={{ color: '#888' }}>
		  current SWE @ fish.audio, prev @ NationGraph
        </p>

        <div className="border-t border-dashed border-border mb-6" />

        <nav className="mono flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a
            href="mailto:h352wang@uwaterloo.ca"
            className="text-accent underline decoration-accent/30 underline-offset-3 hover:decoration-accent transition-colors duration-200"
          >
            email
          </a>
          <Link
            href="/blog"
            className="text-accent underline decoration-accent/30 underline-offset-3 hover:decoration-accent transition-colors duration-200"
          >
            blog
          </Link>
          <a
            href="/Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline decoration-accent/30 underline-offset-3 hover:decoration-accent transition-colors duration-200"
          >
            resume
          </a>
          <a
            href="https://linkedin.com/in/henry-w-se"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline decoration-accent/30 underline-offset-3 hover:decoration-accent transition-colors duration-200"
          >
            linkedin
          </a>
          <a
            href="https://github.com/hwang2409"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline decoration-accent/30 underline-offset-3 hover:decoration-accent transition-colors duration-200"
          >
            github
          </a>
        </nav>
      </div>
    </div>
  );
}

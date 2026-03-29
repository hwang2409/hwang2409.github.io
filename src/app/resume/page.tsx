import Link from 'next/link';

export const metadata = {
  title: 'resume',
};

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="bracket-label text-accent text-sm font-semibold mb-4 cursor-default">[{label}]</h2>
      {children}
    </section>
  );
}

function Entry({
  title,
  sub,
  date,
  location,
  bullets,
}: {
  title: string;
  sub?: string;
  date: string;
  location?: string;
  bullets: string[];
}) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-baseline justify-between gap-4 mb-0.5">
        <span className="text-foreground font-semibold text-sm">{title}</span>
        <span className="text-muted/50 text-xs shrink-0">{date}</span>
      </div>
      {(sub || location) && (
        <div className="flex items-baseline justify-between gap-4 mb-2">
          {sub && <span className="text-muted text-xs">{sub}</span>}
          {location && (
            <span className="text-muted/50 text-xs shrink-0">{location}</span>
          )}
        </div>
      )}
      <ul className="space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="text-muted text-xs leading-relaxed pl-4 relative">
            <span className="absolute left-0 text-muted/40">-</span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Resume() {
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
            className="text-foreground transition-colors duration-200"
          >
            resume
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <div className="w-full max-w-5xl mx-auto px-6 py-10 animate-in">
          <div className="flex items-baseline justify-between mb-8">
            <h1 className="text-xl font-semibold text-foreground">resume</h1>
            <a
              href="/Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link text-accent text-xs hover:text-foreground transition-colors duration-200"
            >
              pdf ↗
            </a>
          </div>

          <Section label="education">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-foreground text-sm font-semibold">
                University of Waterloo
              </span>
              <span className="text-muted/50 text-xs shrink-0">
                Expected April 2026
              </span>
            </div>
            <p className="text-muted text-xs">
              Bachelor of Software Engineering (BSE)
            </p>
          </Section>

          <Section label="experience">
            <Entry
              title="Software Engineer Intern"
              sub="Fish Audio"
              date="Jan 2026 – Present"
              location="San Francisco, CA"
              bullets={[
                'Built an agentic video creation pipeline in React/TypeScript with Zustand state management, orchestrating script generation, asset selection, and TTS audio synthesis into an auto-populated timeline.',
                'Designed a script editing interface using Next.js with drag-and-drop line reordering, per-character voice assignment, and selective regeneration, giving users granular control over AI-generated TTS before final render.',
                'Built the speech-to-text product page end-to-end in Next.js with file upload, live browser via WebRTC, and async transcription polling against a Replicate-hosted ASR model.',
              ]}
            />
            <Entry
              title="Software Engineer Intern"
              sub="NationGraph"
              date="Apr 2025 – Aug 2025"
              location="San Francisco, CA"
              bullets={[
                'Built an entity resolution ML pipeline in PyTorch to normalize 600M+ vendor names, combining TF-IDF embeddings with custom supervised classification models to deduplicate and standardize records at scale.',
                'Built dynamic Python web scrapers using Selenium and BeautifulSoup to extract and normalize public procurement records from government agency websites, storing structured data in PostgreSQL.',
                'Reduced analytics query latency by 38% by rewriting PostgreSQL joins, adding targeted B-tree indexes on high-cardinality columns, and introducing a Redis caching layer for frequently accessed procurement datasets.',
              ]}
            />
          </Section>

          <Section label="projects">
            <Entry
              title="Neuronic"
              sub="React, FastAPI, PostgreSQL, Redis, Celery, AWS"
              date="Jan 2026 – Mar 2026"
              bullets={[
                'Deployed an AI-native learning platform on AWS with an async FastAPI backend behind an ALB, Redis-backed session and embedding caches, and a React 19 SPA on CloudFront, maintaining a sub-200ms p95 API latency.',
                'Built a hybrid retrieval engine combining fastembed vector search with full-text PostgreSQL indexes, powering the automatic knowledge graph construction across the full note corpus.',
                'Designed a multi-tenant collaboration system with RBAC, edit-suggestion workflows, real-time group feeds, integrated with Google Calendar with OAuth 2.0 and a webhook event bus.',
              ]}
            />
            <Entry
              title="whitematter"
              sub="C++, Python, FastAPI, Next.js, CUDA, AWS"
              date="Nov 2025 – Feb 2026"
              bullets={[
                'Built a deep learning framework in C++ with automatic differentiation, 20 layer types (Conv2D, MultiHeadAttention, LSTM) and GPU backends for Metal and CUDA.',
                'Implemented SIMD-optimized tensor ops (AVX/NEON) and OpenMP-parallelized GEMM hitting 99%+ MNIST accuracy in 3 epochs.',
                'Designed a browser-based training platform where users describe a model in natural language, agents generate the model architecture, and the system compiles and runs optimized C++ training code with real-time loss/accuracy streaming via SSE.',
                'Shipped as a multi-stage Docker container with a FastAPI job queue, distributed training workers, ONNX export, mixed-precision FP16, and one-click deployment to AWS EC2 GPU instances for inference saving.',
              ]}
            />
          </Section>

          <Section label="skills">
            <div className="space-y-1.5 text-xs">
              <p>
                <span className="text-foreground">Languages:</span>{' '}
                <span className="text-muted">
                  Python, TypeScript, JavaScript, C/C++, SQL (Postgres)
                </span>
              </p>
              <p>
                <span className="text-foreground">Frameworks:</span>{' '}
                <span className="text-muted">
                  React, Node.js, Flask, FastAPI
                </span>
              </p>
              <p>
                <span className="text-foreground">Tools:</span>{' '}
                <span className="text-muted">
                  Git, Docker, Google Cloud Platform, Jira, AWS
                </span>
              </p>
              <p>
                <span className="text-foreground">Libraries:</span>{' '}
                <span className="text-muted">
                  pandas, NumPy, Matplotlib, PyTorch
                </span>
              </p>
            </div>
          </Section>

          <Section label="awards">
            <ul className="space-y-1.5 text-xs text-muted">
              <li>National Champion of the Hypatia Math Contest (1/5627)</li>
              <li>
                Score of 124.5 on the AMC12 (Top 5% out of 140,000
                participants)
              </li>
              <li>
                Bronze Medal on the CLMC (Hosted by the University of Waterloo)
              </li>
            </ul>
          </Section>
        </div>
      </main>

      <footer className="footer-sep w-full max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-muted">
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

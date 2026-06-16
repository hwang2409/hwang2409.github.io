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
    <section className="resume-section">
      <h2>{label}</h2>
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
    <div className="entry">
      <div className="entry-heading">
        <span className="entry-title">{title}</span>
        <span className="entry-meta">{date}</span>
      </div>
      {(sub || location) && (
        <div className="entry-subheading">
          {sub && <span className="muted">{sub}</span>}
          {location && <span className="entry-meta">{location}</span>}
        </div>
      )}
      <ul>
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Resume() {
  return (
    <section>
      <div className="resume-header">
        <h1 className="page-title">resume</h1>
        <a href="/Resume.pdf" target="_blank" rel="noopener noreferrer">
          pdf
        </a>
      </div>

      <Section label="education">
        <div className="entry-heading">
          <span className="entry-title">University of Waterloo</span>
          <span className="entry-meta">Expected April 2026</span>
        </div>
        <p className="muted">Bachelor of Software Engineering (BSE)</p>
      </Section>

      <Section label="experience">
        <Entry
          title="Software Engineer Intern"
          sub="Fish Audio"
          date="Jan 2026 - Present"
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
          date="Apr 2025 - Aug 2025"
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
          date="Jan 2026 - Mar 2026"
          bullets={[
            'Deployed an AI-native learning platform on AWS with an async FastAPI backend behind an ALB, Redis-backed session and embedding caches, and a React 19 SPA on CloudFront, maintaining a sub-200ms p95 API latency.',
            'Built a hybrid retrieval engine combining fastembed vector search with full-text PostgreSQL indexes, powering the automatic knowledge graph construction across the full note corpus.',
            'Designed a multi-tenant collaboration system with RBAC, edit-suggestion workflows, real-time group feeds, integrated with Google Calendar with OAuth 2.0 and a webhook event bus.',
          ]}
        />
        <Entry
          title="whitematter"
          sub="C++, Python, FastAPI, Next.js, CUDA, AWS"
          date="Nov 2025 - Feb 2026"
          bullets={[
            'Built a deep learning framework in C++ with automatic differentiation, 20 layer types (Conv2D, MultiHeadAttention, LSTM) and GPU backends for Metal and CUDA.',
            'Implemented SIMD-optimized tensor ops (AVX/NEON) and OpenMP-parallelized GEMM hitting 99%+ MNIST accuracy in 3 epochs.',
            'Designed a browser-based training platform where users describe a model in natural language, agents generate the model architecture, and the system compiles and runs optimized C++ training code with real-time loss/accuracy streaming via SSE.',
            'Shipped as a multi-stage Docker container with a FastAPI job queue, distributed training workers, ONNX export, mixed-precision FP16, and one-click deployment to AWS EC2 GPU instances for inference saving.',
          ]}
        />
      </Section>

      <Section label="skills">
        <div className="skill-lines">
          <p>
            <strong>Languages:</strong>{' '}
            <span className="muted">
              Python, TypeScript, JavaScript, C/C++, SQL (Postgres)
            </span>
          </p>
          <p>
            <strong>Frameworks:</strong>{' '}
            <span className="muted">React, Node.js, Flask, FastAPI</span>
          </p>
          <p>
            <strong>Tools:</strong>{' '}
            <span className="muted">Git, Docker, Google Cloud Platform, Jira, AWS</span>
          </p>
          <p>
            <strong>Libraries:</strong>{' '}
            <span className="muted">pandas, NumPy, Matplotlib, PyTorch</span>
          </p>
        </div>
      </Section>

      <Section label="awards">
        <ul className="plain-list">
          <li>National Champion of the Hypatia Math Contest (1/5627)</li>
          <li>Score of 124.5 on the AMC12 (Top 5% out of 140,000 participants)</li>
          <li>Bronze Medal on the CLMC (Hosted by the University of Waterloo)</li>
        </ul>
      </Section>
    </section>
  );
}

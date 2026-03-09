import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center">
      <div className="max-w-xl mx-auto px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100 mb-2">
          Henry Wang
        </h1>
        <p className="text-neutral-400 text-lg mb-8">swe @ uwaterloo</p>
        <p className="text-neutral-300 leading-relaxed mb-10">
          I&apos;m a second year Software Engineering student @ the University
          of Waterloo. My projects delve into ML, computer graphics, game
          programming, and digital logic design. I like to build, snowboard, and
          listen to music.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          <a
            href="mailto:h352wang@uwaterloo.ca"
            className="text-neutral-400 hover:text-neutral-200 transition-colors duration-300"
          >
            email
          </a>
          <Link
            href="/blog"
            className="text-neutral-400 hover:text-neutral-200 transition-colors duration-300"
          >
            blog
          </Link>
          <a
            href="/Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-neutral-200 transition-colors duration-300"
          >
            resume
          </a>
          <a
            href="https://linkedin.com/in/henry-w-se"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-neutral-200 transition-colors duration-300"
          >
            linkedin
          </a>
          <a
            href="https://github.com/hwang2409"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-neutral-200 transition-colors duration-300"
          >
            github
          </a>
        </div>
      </div>
    </div>
  );
}

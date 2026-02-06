import Link from 'next/link';

export default function Contact() {
  return (
    <footer className="py-10">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-100 mb-6 ">
        get in touch
      </h2>
      <p className="text-neutral-300 mb-2">
        chat?{' '}
        <a
          href="mailto:h352wang@uwaterloo.ca"
          className="text-neutral-400 hover:text-neutral-200 transition-colors duration-300 underline"
        >
          email me
        </a>{' '}
        and i&apos;ll respond whenever i can.
      </p>
      <div className="flex flex-wrap gap-6 text-neutral-300">
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
    </footer>
  );
}

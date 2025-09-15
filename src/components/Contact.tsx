export default function Contact() {
  return (
    <footer className="mb-4">
      <h2 className="text-2xl font-bold text-black mb-2 underline">
        get in touch
      </h2>
      <p className="text-black mb-2">
        chat?{' '}
        <a 
          href="mailto:your-email@example.com" 
          className="text-black hover:text-gray-600 transition-colors underline"
        >
          email me
        </a>{' '}
        and i&apos;ll respond whenever i can.
      </p>
      <div className="flex flex-wrap gap-6 text-black">
        <a
          href="/Resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-600 transition-colors"
        >
          resume
        </a>
        <a
          href="https://linkedin.com/in/henry-w-se"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-600 transition-colors"
        >
          linkedin
        </a>
        <a
          href="https://github.com/hwang2409"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-600 transition-colors"
        >
          github
        </a>
      </div>
    </footer>
  );
}


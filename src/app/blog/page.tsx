import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog';

export default function Blog() {
  const blogPosts = getAllBlogPosts();

  return (
    <div className="relative z-10 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-32">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-100 mb-4 border-b border-neutral-800 pb-3">
            blog
          </h1>
          <p className="text-neutral-300 leading-relaxed">
            thoughts on software engineering, computer graphics, and building things from scratch.
          </p>
        </header>

        <main className="space-y-6">
          {blogPosts.map((post, index) => (
            <Link
              key={index}
              href={`/blog/${post.slug}`}
              className="block border-l-2 border-neutral-800 pl-4 hover:border-neutral-500 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer rounded-r-md"
            >
              <h2 className="text-lg font-semibold text-neutral-100 mb-2">
                {post.title}
              </h2>
              <p className="text-neutral-500 text-sm mb-2">
                {post.date}
              </p>
              <p className="text-neutral-300 leading-relaxed">
                {post.excerpt}
              </p>
            </Link>
          ))}
        </main>

        <footer className="mt-12">
          <Link
            href="/"
            className="text-neutral-400 hover:text-neutral-200 transition-colors duration-300 underline"
          >
            ← back to home
          </Link>
        </footer>
      </div>
    </div>
  );
}

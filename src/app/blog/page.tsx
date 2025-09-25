import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog';

export default function Blog() {
  const blogPosts = getAllBlogPosts();

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-black mb-2 underline">
            blog
          </h1>
          <p className="text-black leading-relaxed">
            thoughts on software engineering, computer graphics, and building things from scratch.
          </p>
        </header>

        <main className="space-y-6">
          {blogPosts.map((post, index) => (
            <Link
              key={index}
              href={`/blog/${post.slug}`}
              className="block border-l-2 border-gray-600 pl-4 hover:border-gray-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer rounded-r-md"
            >
              <h2 className="text-lg font-bold text-black mb-2">
                {post.title}
              </h2>
              <p className="text-gray-400 text-sm mb-2">
                {post.date}
              </p>
              <p className="text-black leading-relaxed">
                {post.excerpt}
              </p>
            </Link>
          ))}
        </main>

        <footer className="mt-12">
          <Link 
            href="/"
            className="text-black hover:text-gray-600 transition-colors underline"
          >
            ← back to home
          </Link>
        </footer>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog';

export const metadata = {
  title: "blog",
};

export default function Blog() {
  const blogPosts = getAllBlogPosts();

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center">
      <div className="max-w-xl mx-auto px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-100 mb-8">
          blog
        </h1>

        <ul className="space-y-4 mb-10">
          {blogPosts.map((post, index) => (
            <li key={index}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex items-baseline justify-between gap-4"
              >
                <span className="text-neutral-300 group-hover:text-neutral-100 transition-colors duration-300">
                  {post.title}
                </span>
                <span className="text-neutral-600 text-sm shrink-0">
                  {post.date}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="text-neutral-500 hover:text-neutral-300 transition-colors duration-300 text-sm"
        >
          ← home
        </Link>
      </div>
    </div>
  );
}

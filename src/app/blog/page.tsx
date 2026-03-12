import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog';

export const metadata = {
  title: 'blog',
};

export default function Blog() {
  const blogPosts = getAllBlogPosts();

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
      <div className="panel w-full max-w-lg">
        <h1 className="mono text-2xl font-bold text-foreground mb-8 tracking-tight">
          blog
        </h1>

        <ul className="space-y-4 mb-10">
          {blogPosts.map((post, index) => (
            <li key={index} className="border-b border-dashed border-border pb-4 last:border-0 last:pb-0">
              <Link
                href={`/blog/${post.slug}`}
                className="group flex items-baseline justify-between gap-4"
              >
                <span className="mono text-muted group-hover:text-accent transition-colors duration-200 text-sm">
                  {post.title}
                </span>
                <span className="mono text-muted/30 text-xs shrink-0">
                  {post.date}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="mono text-accent underline decoration-accent/30 underline-offset-3 hover:decoration-accent transition-colors duration-200 text-sm"
        >
          {'<'}- home
        </Link>
      </div>
    </div>
  );
}

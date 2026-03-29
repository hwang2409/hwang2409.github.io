import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog';

export const metadata = {
  title: 'blog',
};

export default function Blog() {
  const blogPosts = getAllBlogPosts();

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <header className="w-full max-w-5xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between text-sm">
        <Link href="/" className="logo text-foreground font-semibold">
          hw.
        </Link>
        <nav className="flex gap-5">
          <Link
            href="/blog"
            className="text-foreground transition-colors duration-200"
          >
            blog
          </Link>
          <Link
            href="/resume"
            className="nav-link text-muted hover:text-foreground transition-colors duration-200"
          >
            resume
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <div className="w-full max-w-5xl mx-auto px-6 py-10">
          <h1 className="text-xl font-semibold text-foreground mb-8 stagger-1">
            writing
          </h1>

          <ul className="space-y-4">
            {blogPosts.map((post, index) => (
              <li key={index} className={`stagger-${Math.min(index + 2, 8)}`}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="blog-item group flex items-baseline justify-between gap-6"
                >
                  <span className="text-muted group-hover:text-foreground transition-colors duration-200 text-sm">
                    {post.title}
                  </span>
                  <span className="text-muted/30 text-xs shrink-0 group-hover:text-muted/60 transition-colors duration-200">
                    {post.date}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
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

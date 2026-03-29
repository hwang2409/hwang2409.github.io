import { getBlogPost, getAllBlogPosts } from '@/lib/blog';
import { markdownToHtml } from '@/lib/blog';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MermaidRenderer from '@/components/MermaidRenderer';
import IframeResizer from '@/components/IframeResizer';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return { title: post.title };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const htmlContent = await markdownToHtml(post.content);

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
            className="nav-link text-muted hover:text-foreground transition-colors duration-200"
          >
            resume
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <div className="w-full max-w-5xl mx-auto px-6 py-10 animate-in">
          <h1 className="text-xl font-semibold text-foreground mb-2">
            {post.title}
          </h1>
          <p className="text-muted/50 text-xs mb-10">
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <article
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
          <MermaidRenderer />
          <IframeResizer />
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
        </div>
      </footer>
    </div>
  );
}

export function generateStaticParams() {
  const posts = getAllBlogPosts();

  if (posts.length === 0) {
    return [{ slug: '_placeholder' }];
  }

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

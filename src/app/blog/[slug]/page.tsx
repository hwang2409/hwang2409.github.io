import { getBlogPost, getAllBlogPosts } from '@/lib/blog';
import { markdownToHtml } from '@/lib/blog';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return { title: post.title };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const htmlContent = markdownToHtml(post.content);

  return (
    <div className="relative z-10 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-32">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-100 mb-4 border-b border-neutral-800 pb-3">
            {post.title}
          </h1>
          <p className="text-neutral-500 text-sm mb-4">
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </header>

        <article
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        <footer className="mt-12">
          <Link
            href="/blog"
            className="text-neutral-400 hover:text-neutral-200 transition-colors duration-300 underline"
          >
            ← back to blog
          </Link>
        </footer>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  const posts = getAllBlogPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

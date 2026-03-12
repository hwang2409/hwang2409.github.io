import { getBlogPost, getAllBlogPosts } from '@/lib/blog';
import { markdownToHtml } from '@/lib/blog';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

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
    <div className="relative z-10 min-h-screen py-16 px-6">
      <div className="panel w-full max-w-lg mx-auto">
        <header className="mb-8">
          <h1 className="mono text-2xl font-bold tracking-tight text-foreground mb-2">
            {post.title}
          </h1>
          <p className="mono text-muted/50 text-xs">
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </header>

        <div className="border-t border-dashed border-border mb-8" />

        <article
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        <div className="border-t border-dashed border-border mt-10 mb-6" />

        <Link
          href="/blog"
          className="mono text-accent underline decoration-accent/30 underline-offset-3 hover:decoration-accent transition-colors duration-200 text-sm"
        >
          {'<'}- blog
        </Link>
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

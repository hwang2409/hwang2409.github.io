import { getBlogPost, getAllBlogPosts } from '@/lib/blog';
import { markdownToHtml } from '@/lib/blog';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MermaidRenderer from '@/components/MermaidRenderer';
import IframeResizer from '@/components/IframeResizer';
import CodeTokenInspector from '@/components/CodeTokenInspector';
import BlogCaseToggle from '@/components/BlogCaseToggle';

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
    <article className="post-article">
      <header className="post-header">
        <h1 className="post-title">{post.title}</h1>
        <div className="post-tools">
          <p className="post-date">
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <BlogCaseToggle />
        </div>
      </header>

      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      <MermaidRenderer />
      <IframeResizer />
      <CodeTokenInspector />
    </article>
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

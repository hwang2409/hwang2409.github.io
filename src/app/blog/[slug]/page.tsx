import { getBlogPost, getAllBlogPosts } from '@/lib/blog';
import { markdownToHtml } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MermaidRenderer from '@/components/MermaidRenderer';
import IframeResizer from '@/components/IframeResizer';
import CodeTokenInspector from '@/components/CodeTokenInspector';
import BlogCaseToggle from '@/components/BlogCaseToggle';
import SourceMapToggle from '@/components/SourceMapToggle';
import BlogTokenGhost from '@/components/BlogTokenGhost';
import { getClientNGramModel } from '@/lib/siteData';
import ManualChrome from '@/components/ManualChrome';

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

  const htmlContent = await markdownToHtml(post.content, {
    slug: post.slug,
    manualSections: true,
  });
  const tokenModel = getClientNGramModel();

  return (
    <>
    <ManualChrome name="WIKI(7)" title="Miscellaneous Manual" status="wiki(7)" />
    <article className="post-article blog-article">
      <h1 className="post-title page-title">{post.title}</h1>
      <section className="man-section">
        <h2>NAME</h2>
        <div className="man-indent post-header">
          <p>{post.title} — {post.excerpt}</p>
          <div className="post-tools">
          <p className="post-date">
            {post.date} · {post.kind} · {post.readingMinutes} min read
          </p>
          <BlogCaseToggle />
          <SourceMapToggle />
          <BlogTokenGhost model={tokenModel} />
          </div>
        </div>
      </section>
      <div className="prose blog-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
      <MermaidRenderer />
      <IframeResizer />
      <CodeTokenInspector />
    </article>
    </>
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

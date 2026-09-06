import { getBlogPost, getAllBlogPosts } from '@/lib/blog';
import { markdownToHtmlWithSections } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import MermaidRenderer from '@/components/MermaidRenderer';
import IframeResizer from '@/components/IframeResizer';
import CodeTokenInspector from '@/components/CodeTokenInspector';
import BlogCaseToggle from '@/components/BlogCaseToggle';
import SourceMapToggle from '@/components/SourceMapToggle';
import BlogTokenGhost from '@/components/BlogTokenGhost';
import { getClientNGramModel } from '@/lib/siteData';
import Contents from '@/components/Contents';

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

  const { html: htmlContent, sections } = await markdownToHtmlWithSections(post.content, {
    slug: post.slug,
  });
  const tokenModel = getClientNGramModel();
  const posts = getAllBlogPosts();
  const postIndex = posts.findIndex((candidate) => candidate.slug === post.slug);
  const previousPost = postIndex > 0 ? posts[postIndex - 1] : undefined;
  const nextPost = postIndex >= 0 ? posts[postIndex + 1] : undefined;

  return (
    <>
    <article className="post-article blog-article">
      <h1 className="post-title page-title">{post.title}</h1>
      <div className="post-header">
        <p className="post-meta"><time dateTime={post.date}>{post.date}</time> · {post.kind} · {post.readingMinutes} min read</p>
        <p className="post-excerpt">{post.excerpt}</p>
        <div className="post-tools">
          <BlogCaseToggle />
          <SourceMapToggle />
          <BlogTokenGhost model={tokenModel} />
        </div>
      </div>
      <Contents sections={sections} />
      <div className="prose blog-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
      <nav className="post-pager" aria-label="post navigation">
          {previousPost && (
            <span><span className="fine-print">previous:</span> <Link href={`/blog/${previousPost.slug}`}>{previousPost.title}</Link></span>
          )}
          {nextPost && (
            <span><span className="fine-print">next:</span> <Link href={`/blog/${nextPost.slug}`}>{nextPost.title}</Link></span>
          )}
          <Link href="/blog">all posts</Link>
      </nav>
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

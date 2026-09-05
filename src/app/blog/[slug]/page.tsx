import { getBlogPost, getAllBlogPosts } from '@/lib/blog';
import { getMarkdownSections, markdownToHtml } from '@/lib/markdown';
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
import ManualChrome from '@/components/ManualChrome';
import ManualContents from '@/components/ManualContents';

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
  const sections = getMarkdownSections(post.content);
  const tokenModel = getClientNGramModel();
  const posts = getAllBlogPosts();
  const postIndex = posts.findIndex((candidate) => candidate.slug === post.slug);
  const previousPost = postIndex > 0 ? posts[postIndex - 1] : undefined;
  const nextPost = postIndex >= 0 ? posts[postIndex + 1] : undefined;

  return (
    <>
    <ManualChrome name="WIKI(7)" title="Miscellaneous Manual" status="wiki(7)" currentSection="blog" sectionHref="/blog" />
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
      <ManualContents sections={sections} />
      <div className="prose blog-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
      <section className="man-section post-see-also">
        <h2>SEE ALSO</h2>
        <div className="man-indent post-pager">
          {previousPost && (
            <span><span className="fine-print">previous:</span> <Link href={`/blog/${previousPost.slug}`}>{previousPost.title}</Link></span>
          )}
          {nextPost && (
            <span><span className="fine-print">next:</span> <Link href={`/blog/${nextPost.slug}`}>{nextPost.title}</Link></span>
          )}
          <Link href="/blog">henry-blog(7)</Link>
        </div>
      </section>
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

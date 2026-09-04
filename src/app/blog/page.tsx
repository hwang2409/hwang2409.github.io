import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog';
import ManualChrome from '@/components/ManualChrome';

export const metadata = {
  title: 'blog',
};

export default function Blog() {
  const blogPosts = getAllBlogPosts();

  return (
    <>
    <ManualChrome name="HENRY-BLOG(7)" title="Miscellaneous Manual" status="henry-blog(7) — 7 entries" />
    <section className="man-section page-section">
      <h1 className="page-title">ENTRIES</h1>
      <p className="man-indent page-note">notes and projects</p>

      <ul className="post-list tagged-list">
        {blogPosts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="post-link">
              <span className="post-link-row"><span className="post-date">{post.date}</span><span><strong className="post-link-title">{post.title}</strong> <span className="post-excerpt">— {post.excerpt}</span> <em className="post-kind">[{post.kind}]</em></span></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
    </>
  );
}

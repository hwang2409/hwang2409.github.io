import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog';

export const metadata = {
  title: 'blog',
};

export default function Blog() {
  const blogPosts = getAllBlogPosts();

  return (
    <>
    <section className="page-section">
      <h1 className="page-title">blog</h1>
      <p className="page-note">notes and projects</p>

      <ul className="post-list">
        {blogPosts.map((post) => (
          <li key={post.slug}>
            <span className="post-link-row"><time className="post-date" dateTime={post.date}>{post.date}</time><Link href={`/blog/${post.slug}`} className="post-link-title">{post.title}</Link></span>
          </li>
        ))}
      </ul>
    </section>
    </>
  );
}

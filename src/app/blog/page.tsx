import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog';

export const metadata = {
  title: 'blog',
};

export default function Blog() {
  const blogPosts = getAllBlogPosts();

  return (
    <section>
      <h1 className="page-title">writing</h1>
      <p className="page-note">notes and projects</p>

      <ul className="post-list">
        {blogPosts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="post-link">
              <span className="post-link-row">
                <span className="post-link-title">{post.title}</span>
                <span className="post-date">
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </span>
              <span className="post-excerpt">{post.excerpt}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

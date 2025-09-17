import { getBlogPost, getAllBlogPosts } from '@/lib/blog';
import { markdownToHtml } from '@/lib/blog';
import { notFound } from 'next/navigation';

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getBlogPost(params.slug);

  if (!post) {
    notFound();
  }

  const htmlContent = markdownToHtml(post.content);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-black mb-2 underline">
            {post.title}
          </h1>
          <p className="text-gray-400 text-sm mb-4">
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </header>

        <article 
          className="prose prose-black max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        <footer className="mt-12">
          <a 
            href="/blog"
            className="text-black hover:text-gray-600 transition-colors underline"
          >
            ← back to blog
          </a>
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

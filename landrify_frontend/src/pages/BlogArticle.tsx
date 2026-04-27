import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { getBlogArticle } from '../content/blog';
import { usePageMeta } from '../hooks/usePageMeta';

function formatPublishedDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getBlogArticle(slug) : undefined;

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  usePageMeta({
    title: `${article.title} | Landrify Blog`,
    description: article.metaDescription,
    path: `/blog/${article.slug}`,
    type: 'article',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.metaDescription,
        datePublished: article.publishedAt,
        dateModified: article.publishedAt,
        author: {
          '@type': 'Organization',
          name: 'Landrify',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Landrify',
          logo: {
            '@type': 'ImageObject',
            url: 'https://landrify.vercel.app/LANDRIFY.png',
          },
        },
        mainEntityOfPage: `https://landrify.vercel.app/blog/${article.slug}`,
        keywords: article.keywords.join(', '),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: article.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  });

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-landrify-line bg-landrify-bg/55">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-landrify-green"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-landrify-green">
            {article.category}
          </p>
          <h1 className="mt-4 text-4xl font-serif text-landrify-ink md:text-5xl">
            {article.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-gray-600">{article.excerpt}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-500">
            <span>{formatPublishedDate(article.publishedAt)}</span>
            <span>|</span>
            <span>{article.readingTime}</span>
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="prose max-w-none prose-headings:font-serif prose-headings:text-landrify-ink prose-p:text-gray-700 prose-li:text-gray-700">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>

        <section className="mt-14 border-t border-landrify-line pt-10">
          <h2 className="text-3xl font-serif text-landrify-ink">Frequently asked questions</h2>
          <div className="mt-6 space-y-5">
            {article.faqs.map((faq) => (
              <div key={faq.question} className="border-b border-landrify-line pb-5">
                <h3 className="text-lg font-semibold text-landrify-ink">{faq.question}</h3>
                <p className="mt-2 text-base leading-7 text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-landrify-bg/70 px-6 py-8 sm:px-8">
          <h2 className="text-3xl font-serif text-landrify-ink">Want to verify a real plot?</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            Landrify combines location checks, legal signals, environmental risk, and AI analysis
            so buyers can move from suspicion to evidence before they pay.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/register">
              <Button className="h-11 px-6">
                Start a scan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/blog">
              <Button variant="outline" className="h-11 px-6">
                Read more guides
              </Button>
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}

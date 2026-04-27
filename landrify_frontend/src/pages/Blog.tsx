import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';

import { blogArticles } from '../content/blog';
import { usePageMeta } from '../hooks/usePageMeta';
import { Input } from '../components/ui/Input';

export function Blog() {
  const [query, setQuery] = useState('');

  usePageMeta({
    title: 'Landrify Blog | Land verification guides for Nigeria',
    description:
      'Read practical guides on land verification, government acquisition risk, flood exposure, land documents, and fraud prevention in Nigeria.',
    path: '/blog',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Landrify Blog',
      url: 'https://landrify.vercel.app/blog',
      description:
        'Land verification, environmental due diligence, and fraud prevention guides for Nigerian land buyers.',
    },
  });

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return blogArticles;

    return blogArticles.filter((article) =>
      [article.title, article.excerpt, article.category, ...article.keywords]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-landrify-line bg-landrify-bg/55">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-landrify-green">Landrify Blog</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-serif text-landrify-ink md:text-5xl">
            Practical land buying guides for Nigerian buyers, agents, and developers
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
            These articles are built around the exact questions people ask before buying land:
            title checks, government acquisition, flood exposure, document meaning, and fraud risk.
          </p>

          <div className="relative mt-8 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search guides by topic or keyword"
              className="pl-11"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="divide-y divide-landrify-line border-t border-landrify-line">
            {filteredArticles.map((article) => (
              <article key={article.slug} className="py-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                      {article.category} | {article.readingTime}
                    </p>
                    <h2 className="mt-3 text-2xl font-serif text-landrify-ink md:text-3xl">
                      <Link to={`/blog/${article.slug}`} className="hover:text-landrify-green transition-colors">
                        {article.title}
                      </Link>
                    </h2>
                    <p className="mt-3 text-base leading-7 text-gray-600">{article.excerpt}</p>
                    <p className="mt-4 text-sm text-gray-500">
                      Keywords: {article.keywords.slice(0, 3).join(', ')}
                    </p>
                  </div>

                  <div className="lg:pt-8">
                    <Link
                      to={`/blog/${article.slug}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-landrify-green transition-colors hover:text-landrify-green-dark"
                    >
                      Read article
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="py-16 text-center text-gray-500">
              No guides matched that search yet. Try terms like "government acquisition", "C of O", or "flood risk".
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

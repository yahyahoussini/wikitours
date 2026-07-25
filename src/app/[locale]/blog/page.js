import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { hreflangAlternates } from '@/lib/seo';
import { getArticles, getCovers } from '@/lib/data/content';
import { publicMediaUrl } from '@/lib/media';
import BlogGrid from '@/components/site/BlogGrid';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = false;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.pages.blogTitle, description: t.pages.blogDesc, alternates: hreflangAlternates(locale, '/blog') };
}

export default async function BlogPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const articles = await getArticles();
  // Cover = first image of each article's gallery (admin-uploaded).
  const covers = await getCovers('articles', articles.map((a) => a.id));
  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, {
    dateStyle: 'long',
  });

  // Serialized for the client grid — dates formatted server-side so the
  // rendered string is identical on both sides (no hydration drift).
  const cards = articles.map((article) => {
    const cover = covers.get(article.id);
    return {
      id: article.id,
      slug: article.slug,
      title: pickLang(article, 'title', locale),
      excerpt: pickLang(article, 'excerpt', locale),
      category: article.category,
      author: article.author_name,
      date: article.published_at ? dateFmt.format(new Date(article.published_at)) : null,
      cover: cover
        ? { src: publicMediaUrl(cover.path), alt: pickLang(cover, 'alt', locale) }
        : null,
    };
  });

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-8">
      <h1 className="text-3xl font-bold text-bm-black sm:text-4xl">{t.pages.blogTitle}</h1>
      <BlogGrid
        locale={locale}
        articles={cards}
        labels={{ search: t.pages.blogSearch, noResults: t.pages.blogNoResults }}
      />
      <WhatsAppFloat locale={locale} />
    </main>
  );
}

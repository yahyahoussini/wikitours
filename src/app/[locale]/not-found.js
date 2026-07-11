'use client';

import { usePathname } from 'next/navigation';
import { getDictionary, isLocale } from '@/lib/i18n';

export default function NotFound() {
  const pathname = usePathname() ?? '/';
  const first = pathname.split('/')[1];
  const locale = isLocale(first) ? first : 'fr';
  const t = getDictionary(locale);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold text-bm-black">{t.notFound.title}</h1>
      <p className="text-bm-black/70">{t.notFound.body}</p>
      <a
        href={`/${locale}`}
        className="mt-2 inline-flex items-center rounded-ctrl bg-wiki-blue px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
      >
        {t.notFound.backHome}
      </a>
    </main>
  );
}

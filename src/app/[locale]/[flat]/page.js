import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { getPublishedOffers, getOccasions, getCovers } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { publicMediaUrl } from '@/lib/media';
import { waLink } from '@/lib/whatsapp';
import { OMRA_YEAR, parseMonthSlug, monthPagePath, monthName, CITY_SLUGS } from '@/lib/months';
import { hreflangAlternates } from '@/lib/seo';
import { routeTitle } from '@/lib/titles';
import BrandLockup from '@/components/site/BrandLockup';
import PackagesSection from '@/components/site/PackagesSection';
import LeadForm from '@/components/LeadForm';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

const nf = new Intl.NumberFormat('fr-MA');

/**
 * One dynamic segment for the flat landing URLs:
 *   /omra-{mois}-{year}   (12 months, ONE year constant, auto-308 rollover)
 *   /omra-{occasion}      (DB occasions incl. Hijri — indexed even when empty)
 *   /omra-depuis-{ville}  (8-city whitelist)
 * Anything else → 404.
 */
async function resolveFlat(flat) {
  const month = parseMonthSlug(flat);
  if (month) return { kind: 'month', ...month };

  const cityMatch = flat.match(/^omra-depuis-([a-z]+)$/);
  if (cityMatch && CITY_SLUGS[cityMatch[1]]) {
    return { kind: 'city', citySlug: cityMatch[1], cityName: CITY_SLUGS[cityMatch[1]] };
  }

  const occMatch = flat.match(/^omra-([a-z0-9-]+)$/);
  if (occMatch) {
    const occasions = await getOccasions();
    const occasion = occasions.find((o) => o.slug === occMatch[1]);
    if (occasion) return { kind: 'occasion', occasion };
  }
  return null;
}

export async function generateMetadata({ params }) {
  const { locale, flat } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const resolved = await resolveFlat(flat);
  if (!resolved) return {};
  const alternates = hreflangAlternates(locale, `/${flat}`);
  if (resolved.kind === 'month') {
    const month = monthName(resolved.monthIndex, locale);
    return {
      title: { absolute: routeTitle('month', locale, { month }) },
      description: `Omra ${month} ${OMRA_YEAR} depuis le Maroc — dates, hôtels et prix. ${t.brand.premiumService}`,
      alternates,
    };
  }
  if (resolved.kind === 'city') {
    return { title: t.cityPage.title.replace('{city}', resolved.cityName), description: t.cityPage.answer, alternates };
  }
  return {
    title:
      pickLang(resolved.occasion, 'seo_title', locale) ??
      `Omra ${pickLang(resolved.occasion, 'name', locale)}`,
    description: pickLang(resolved.occasion, 'seo_description', locale) ??
      pickLang(resolved.occasion, 'description', locale),
    alternates,
  };
}

export default async function FlatLandingPage({ params }) {
  const { locale, flat } = await params;
  if (!isLocale(locale)) notFound();

  const resolved = await resolveFlat(flat);
  if (!resolved) notFound();

  // Rollover: old-year month URLs 308 to the current OMRA_YEAR page.
  if (resolved.kind === 'month' && resolved.year !== OMRA_YEAR) {
    if (resolved.year < OMRA_YEAR) {
      permanentRedirect(`/${locale}${monthPagePath(resolved.monthIndex)}`);
    }
    notFound();
  }

  const t = getDictionary(locale);
  const [offers, settings] = await Promise.all([getPublishedOffers(), getSettings()]);
  const whatsappHref = waLink(settings?.whatsapp_number);

  let matching = offers;
  let heading;
  let answer = null;
  let alertSource = `landing_${flat}`;

  if (resolved.kind === 'month') {
    const month = monthName(resolved.monthIndex, locale);
    matching = offers.filter(
      (o) => o.date_start && new Date(o.date_start).getUTCMonth() === resolved.monthIndex &&
        new Date(o.date_start).getUTCFullYear() === OMRA_YEAR,
    );
    heading = t.months.pageTitle.replace('{month}', month).replace('{year}', String(OMRA_YEAR));
    const minPrice = Math.min(...matching.map((o) => o.starting_price).filter((p) => p != null));
    answer = matching.length
      ? t.months.answerWithOffers
          .replace('{n}', matching.length)
          .replace('{month}', month)
          .replace('{year}', String(OMRA_YEAR))
          .replace('{min}', Number.isFinite(minPrice) ? nf.format(minPrice) : '—')
      : t.months.emptyTitle.replace('{month}', month).replace('{year}', String(OMRA_YEAR));
  } else if (resolved.kind === 'occasion') {
    matching = offers.filter((o) => o.occasion?.slug === resolved.occasion.slug);
    const occasionName = pickLang(resolved.occasion, 'name', locale);
    heading = `Omra ${occasionName}`;
    // Answer-first (LAWS §5): admin description if any, else a computed line
    // when offers match, else the honest empty state — never a blank lede.
    const minPrice = Math.min(...matching.map((o) => o.starting_price).filter((p) => p != null));
    answer = pickLang(resolved.occasion, 'description', locale) ??
      (matching.length === 0
        ? t.occasionPage.empty
        : t.occasionPage.answerWithOffers
            .replace('{n}', matching.length)
            .replace('{occasion}', occasionName)
            .replace('{min}', Number.isFinite(minPrice) ? nf.format(minPrice) : '—'));
  } else {
    heading = t.cityPage.title.replace('{city}', resolved.cityName);
    answer = t.cityPage.answer;
    alertSource = `city_${resolved.citySlug}`;
  }

  const covers = await getCovers('offers', matching.map((o) => o.id));

  const cardT = {
    ...t.offer,
    reserve: t.cta.reserve,
    whatsappAlt: t.cta.whatsappAlt,
    details: t.cta.details,
    filterAll: t.archive.filterAll,
    monthAll: t.home.selectorMonth,
  };

  return (
    <div className="bg-bm-black text-white">
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-8">
        <BrandLockup locale={locale} size="sm" />
        <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">{heading}</h1>
        {answer ? (
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-white/80">{answer}</p>
        ) : null}

        {matching.length > 0 ? (
          <div className="mt-8">
            <PackagesSection
              offers={matching.map((offer) => ({
                ...offer,
                cover: covers.get(offer.id)
                  ? { src: publicMediaUrl(covers.get(offer.id).path), alt: pickLang(covers.get(offer.id), 'alt', locale) }
                  : null,
              }))}
              occasions={[]}
              locale={locale}
              t={cardT}
              whatsappHref={whatsappHref}
            />
          </div>
        ) : (
          /* Honest empty state + alert micro-form */
          <section className="mt-8 max-w-md rounded-panel border border-bm-gold/25 bg-bm-black-soft p-6">
            <p className="text-sm leading-relaxed text-white/75">{t.months.alertPrompt}</p>
            <div className="mt-4">
              <LeadForm locale={locale} labels={t.form} dark source={alertSource} whatsappNumber={settings?.whatsapp_number} />
            </div>
            <Link
              href={`/${locale}/bab-makkah`}
              className="mt-4 inline-block text-sm font-semibold text-bm-gold underline-offset-4 hover:underline"
            >
              {t.months.browseAll} →
            </Link>
          </section>
        )}
      </main>
      <WhatsAppFloat locale={locale} />
    </div>
  );
}

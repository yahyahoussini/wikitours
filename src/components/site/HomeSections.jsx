import Image from 'next/image';
import Link from 'next/link';
import { getDictionary, pickLang } from '@/lib/i18n';
import { getGallerySlides, getTestimonialMedia } from '@/lib/data/gallery';
import { SETTINGS_HERO_ENTITY_ID } from '@/lib/entities';
import { publicMediaUrl } from '@/lib/media';
import { BLUR_DATA_URL } from '@/lib/blur';
import { OMRA_YEAR, MONTH_SLUGS, monthName } from '@/lib/months';
import BrandLockup from '@/components/site/BrandLockup';
import Icon from '@/components/site/Icon';
import SectionBridge from '@/components/site/SectionBridge';
import HeroSlideshow from '@/components/site/HeroSlideshow';
import ReelsRow from '@/components/site/ReelsRow';
import ScreenshotWall from '@/components/site/ScreenshotWall';
import SmartGallery from '@/components/SmartGallery';

/* 1 — Inset rounded slideshow hero (admin-managed via entity settings_hero) */
export async function Hero({ locale }) {
  const t = getDictionary(locale);
  const slides = await getGallerySlides('settings_hero', SETTINGS_HERO_ENTITY_ID, locale);
  const images = slides.filter((s) => s.kind === 'image');

  return (
    <section className="px-3">
      <div className="relative mx-auto min-h-[70vh] max-w-6xl overflow-hidden rounded-panel bg-bm-black shadow-float">
        {images.length ? (
          <HeroSlideshow slides={images} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-bm-black via-bm-black-soft to-[#20303a]" aria-hidden="true" />
        )}

        <div className="relative flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 py-20 text-center text-white">
          <span className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur">
            {t.home.heroBadge}
          </span>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            {t.home.heroLine1}
            <span className="accent-line mt-1 block font-normal text-bm-gold-light">
              {t.home.heroLine2}
            </span>
          </h1>
          <p className="max-w-xl text-white/75">{t.home.intro}</p>
          <Link
            href={`/${locale}/bab-makkah`}
            data-wt="cta_click"
            data-wt-label="hero"
            data-magnetic
            className="cta-shine cta-press rounded-full border-2 border-bm-gold-light px-8 py-3 text-sm font-semibold text-bm-gold-light transition hover:bg-bm-gold-light hover:text-bm-black"
          >
            {t.cta.discoverOffers}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* 4 — WHY-US dark band: lockup, 4 real stats (gold), framed image */
export async function StatsBand({ locale, settings }) {
  const t = getDictionary(locale);
  const slides = await getGallerySlides('settings_hero', SETTINGS_HERO_ENTITY_ID, locale);
  const frame = slides.filter((s) => s.kind === 'image')[1] ?? null;

  const stats = [
    settings?.community_count ? [settings.community_count, t.home.statCommunity] : null,
    [String(new Date().getFullYear() - 2016), t.home.statSince],
    settings?.gbp_rating ? [`${settings.gbp_rating} ★`, t.home.statRating] : null,
    settings?.gbp_review_count ? [String(settings.gbp_review_count), t.home.statReviews] : null,
  ].filter(Boolean);

  if (stats.length === 0) return null;

  return (
    <section className="bg-bm-black text-white">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
        <div>
          <BrandLockup locale={locale} size="md" />
          <h2 className="mt-5 text-3xl font-bold leading-tight">{t.home.whyTitle}</h2>
          <dl className="mt-8 grid grid-cols-2 gap-6">
            {stats.map(([value, label]) => (
              <div key={label} data-reveal>
                <dt className="gold-shimmer text-3xl font-bold tabular-nums" data-count={value}>
                  {value}
                </dt>
                <dd className="mt-1 text-sm text-white/60">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
        {frame ? (
          <div className="relative">
            <div className="absolute -inset-3 rounded-panel border border-bm-gold/30" aria-hidden="true" />
            <Image
              src={frame.src}
              alt={frame.alt}
              width={frame.width ?? 800}
              height={frame.height ?? 600}
              sizes="(min-width: 1024px) 45vw, 100vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="relative h-auto w-full rounded-panel object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* 5 — Hotels cards */
export function HotelsSection({ locale, hotels, covers }) {
  const t = getDictionary(locale);
  if (!hotels.length) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 py-[72px] lg:py-32">
      <h2 className="text-3xl font-bold text-bm-black">{t.home.hotelsTitle}</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {hotels.map((hotel) => {
          const cover = covers.get(hotel.id);
          return (
            <Link
              key={hotel.id}
              data-reveal
              href={`/${locale}/hotel/${hotel.slug}`}
              className="group overflow-hidden rounded-card bg-white shadow-hairline transition hover:shadow-lift"
            >
              <div className="relative aspect-[16/10] bg-bm-black/5">
                {cover ? (
                  <Image
                    src={publicMediaUrl(cover.path)}
                    alt={pickLang(cover, 'alt', locale) ?? hotel.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    className="object-cover transition duration-500 ease-luxe group-hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-bm-black">
                  {hotel.name}
                  {hotel.stars ? (
                    <span className="ms-2 text-sm font-normal tracking-widest text-bm-gold">
                      {'★'.repeat(hotel.stars)}
                    </span>
                  ) : null}
                </h3>
                <p className="mt-1 text-sm text-bm-black/60">
                  {hotel.city === 'makkah' ? t.offer.makkah : t.offer.madinah}
                  {hotel.distance_to_haram_m != null
                    ? ` · ${t.offer.distanceToHaram.replace('{m}', hotel.distance_to_haram_m)}`
                    : ''}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* 6 — Comment ça marche: 3 steps ending on the written contract */
export function StepsSection({ locale, dark = false }) {
  const t = getDictionary(locale);
  const steps = [
    [t.home.step1Title, t.home.step1Body],
    [t.home.step2Title, t.home.step2Body],
    [t.home.step3Title, t.home.step3Body],
  ];
  return (
    <section className={`mx-auto max-w-5xl px-6 py-[72px] lg:py-32 ${dark ? 'text-white' : ''}`}>
      <h2 className={`text-3xl font-bold ${dark ? '' : 'text-bm-black'}`}>{t.home.stepsTitle}</h2>
      <ol className="mt-6 grid gap-5 sm:grid-cols-3">
        {steps.map(([title, body], i) => (
          <li
            key={title}
            data-reveal
            className={`rounded-card p-5 shadow-hairline ${dark ? 'border border-white/10 bg-white/5' : 'bg-white'}`}
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-bm-gold text-sm font-bold text-bm-black">
              {i + 1}
            </span>
            <h3 className="mt-3 font-bold">{title}</h3>
            <p className={`mt-1 text-sm ${dark ? 'text-white/60' : 'text-bm-black/60'}`}>{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* 7+8 — Proof: reels (dark) + screenshot wall + Google badge */
export async function ProofSection({ locale, testimonials, settings }) {
  const t = getDictionary(locale);
  // Media comes from each testimonial's gallery.
  const { reels, shots, texts } = await getTestimonialMedia(testimonials, locale);

  if (!reels.length && !shots.length && !texts.length) return null;

  return (
    <>
      {reels.length ? (
        <>
          <SectionBridge from="light" to="dark" />
          <section className="bg-bm-black text-white">
            <div className="mx-auto max-w-5xl px-6 py-[72px] lg:py-32">
              <h2 className="text-3xl font-bold">{t.home.reelsTitle}</h2>
              <div className="mt-6">
                <ReelsRow reels={reels} />
              </div>
            </div>
          </section>
          <SectionBridge from="dark" to="light" />
        </>
      ) : null}

      <section className="mx-auto max-w-5xl px-6 py-[72px] lg:py-32">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-3xl font-bold text-bm-black">{t.home.proofTitle}</h2>
          {settings?.gbp_review_count > 0 && settings?.gbp_rating ? (
            <a
              href={settings.gbp_review_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-bm-black/10 bg-white px-4 py-1.5 text-sm font-semibold shadow-hairline"
            >
              {t.home.googleBadge
                .replace('{rating}', settings.gbp_rating)
                .replace('{count}', settings.gbp_review_count)}
            </a>
          ) : null}
        </div>

        {texts.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {texts.slice(0, 6).map((item) => (
              <figure key={item.id} className="rounded-card bg-white p-5 shadow-hairline">
                {item.rating ? (
                  <p className="text-sm tracking-widest text-bm-gold">{'★'.repeat(item.rating)}</p>
                ) : null}
                <blockquote className="mt-2 text-sm leading-relaxed text-bm-black/80">
                  {pickLang(item, 'content', locale)}
                </blockquote>
                <figcaption className="mt-3 text-xs font-semibold text-bm-black/50">
                  {item.author_name}
                  {item.author_city ? ` · ${item.author_city}` : ''}
                  {pickLang(item, 'trip_label', locale) ? ` · ${pickLang(item, 'trip_label', locale)}` : ''}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}

        {shots.length ? (
          <div className="mt-8">
            <ScreenshotWall shots={shots} closeLabel={t.a11y.close} />
          </div>
        ) : null}
      </section>
    </>
  );
}

/* 9 — Omra par mois: compact 12 links */
export function MonthsLinks({ locale, compact = true }) {
  const t = getDictionary(locale);
  return (
    <section id="par-mois" className="mx-auto max-w-5xl px-6 py-[72px] lg:py-32">
      <h2 className={`font-bold text-bm-black ${compact ? 'text-2xl' : 'text-3xl'}`}>{t.home.monthsTitle}</h2>
      <nav className="mt-5 flex flex-wrap gap-2">
        {MONTH_SLUGS.map((slug, i) => (
          <Link
            key={slug}
            href={`/${locale}/omra-${slug}-${OMRA_YEAR}`}
            className="rounded-full border border-bm-black/10 bg-white px-4 py-2 text-sm font-medium text-bm-black/75 shadow-hairline transition hover:border-bm-gold hover:text-bm-black"
          >
            {monthName(i, locale)} {OMRA_YEAR}
          </Link>
        ))}
      </nav>
    </section>
  );
}

/* 11 — Histoire + équipe (timeline + faces) */
export async function StorySection({ locale, timeline, team }) {
  const t = getDictionary(locale);
  if (!timeline.length && !team.length) return null;

  const faces = new Map();
  for (const member of team) {
    const slides = await getGallerySlides('team_members', member.id, locale);
    const face = slides.find((s) => s.kind === 'image');
    if (face) faces.set(member.id, face);
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-[72px] lg:py-32">
      <h2 className="text-3xl font-bold text-bm-black">{t.home.storyTitle}</h2>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {timeline.length ? (
          <ol className="relative flex flex-col gap-6 border-s-2 border-bm-gold/40 ps-6">
            {timeline.map((item) => (
              <li key={item.id}>
                <span className="absolute -start-[7px] mt-1.5 block size-3 rounded-full bg-bm-gold" aria-hidden="true" />
                <h3 className="font-bold text-bm-black">{pickLang(item, 'title', locale)}</h3>
                <p className="mt-1 text-sm text-bm-black/60">{pickLang(item, 'body', locale)}</p>
              </li>
            ))}
          </ol>
        ) : null}

        {team.length ? (
          <div className="grid grid-cols-2 gap-4 self-start sm:grid-cols-3">
            {team.map((member) => {
              const face = faces.get(member.id);
              return (
                <figure key={member.id} className="text-center">
                  <div className="relative mx-auto aspect-square w-full max-w-32 overflow-hidden rounded-full bg-bm-black/5 shadow-hairline">
                    {face ? (
                      <Image src={face.src} alt={member.name} fill sizes="128px" loading="lazy" className="object-cover" />
                    ) : null}
                  </div>
                  <figcaption className="mt-2">
                    <p className="text-sm font-bold text-bm-black">{member.name}</p>
                    <p className="text-xs text-bm-black/50">{pickLang(member, 'role', locale)}</p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* 12 — Garanties strip (+ optional trust-marks marquee, B13) */
export function GuaranteesStrip({ locale, license, marks = [] }) {
  const t = getDictionary(locale);
  const items = [
    [t.home.guaranteeLicense, `/${locale}/agrement`],
    [t.home.guaranteeNoOnlinePayment, null],
    [t.home.guaranteeContract, null],
    [t.home.guaranteeSupport, null],
  ];
  const trail = marks.length ? [...marks, ...marks] : []; // duplicated for a seamless -50% loop
  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h2 className="sr-only">{t.home.guaranteesTitle}</h2>
      {trail.length ? (
        <div className="marquee mb-8" aria-hidden="true">
          <div className="marquee__track py-1 text-sm font-semibold uppercase tracking-widest text-bm-black/35">
            {trail.map((mark, i) => (
              <span key={`${mark}-${i}`}>{mark}</span>
            ))}
          </div>
        </div>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([label, href]) => {
          const inner = (
            <span className="flex items-center gap-2.5 text-sm font-semibold text-bm-black/80">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bm-gold/15 text-bm-gold">
                <Icon name="check" className="size-4" />
              </span>
              {label}
              {href && license ? <span className="text-xs font-normal text-bm-black/40">({license})</span> : null}
            </span>
          );
          return (
            <li key={label} className="rounded-card border border-bm-black/5 bg-white px-4 py-3 shadow-hairline">
              {href ? <Link href={href} className="hover:text-wiki-blue">{inner}</Link> : inner}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* 13 — Blog latest 3 */
export function BlogTeasers({ locale, articles }) {
  const t = getDictionary(locale);
  if (!articles.length) return null;
  return (
    <section className="mx-auto max-w-5xl px-6 py-[72px] lg:py-32">
      <h2 className="text-3xl font-bold text-bm-black">{t.home.blogTitle}</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {articles.slice(0, 3).map((article) => (
          <Link
            key={article.id}
            data-reveal
            href={`/${locale}/blog/${article.slug}`}
            className="group rounded-card bg-white p-5 shadow-hairline transition hover:shadow-lift"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-wiki-blue">{article.category}</p>
            <h3 className="mt-2 font-bold leading-snug text-bm-black group-hover:text-wiki-blue">
              {pickLang(article, 'title', locale)}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm text-bm-black/60">{pickLang(article, 'excerpt', locale)}</p>
            <p className="mt-3 text-xs font-semibold text-bm-gold">{t.cta.readMore} →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* 14 — FAQ: native details/summary, first one open (crawlable HTML) */
export function FaqSection({ locale, faqs, title = null }) {
  const t = getDictionary(locale);
  if (!faqs.length) return null;
  return (
    <section className="mx-auto max-w-3xl px-6 py-[72px] lg:py-32">
      <h2 className="text-3xl font-bold text-bm-black">{title ?? t.home.faqTitle}</h2>
      <div className="mt-6 flex flex-col gap-3">
        {faqs.map((faq, i) => (
          <details
            key={faq.id}
            open={i === 0}
            className="group rounded-card border border-bm-black/5 bg-white px-5 py-4 shadow-hairline"
          >
            <summary className="cursor-pointer list-none font-semibold text-bm-black marker:content-none">
              <span className="flex items-center justify-between gap-4">
                {pickLang(faq, 'question', locale)}
                <span className="text-bm-gold transition group-open:rotate-45">
                  <Icon name="plus" className="size-4" />
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-bm-black/70">
              {pickLang(faq, 'answer', locale)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* 15 — Final CTA with the Playfair labbayk line */
export function FinalCta({ locale }) {
  const t = getDictionary(locale);
  return (
    <section className="bg-bm-black text-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-20 text-center">
        <p className="accent-line text-3xl text-bm-gold-light sm:text-4xl">{t.home.finalCtaLine}</p>
        <p className="text-white/70">{t.home.finalCtaSub}</p>
        <Link
          href={`/${locale}/bab-makkah`}
          data-wt="cta_click"
          data-wt-label="final"
          className="cta-shine cta-press rounded-full bg-wiki-blue px-8 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
        >
          {t.cta.reserve}
        </Link>
        <BrandLockup locale={locale} size="sm" className="mt-4 opacity-80" />
      </div>
    </section>
  );
}

/* 10 — Destinations (Wiki Tours surface, hover-advance galleries) */
export function DestinationsSection({ locale, destinations }) {
  const t = getDictionary(locale);
  if (!destinations.length) return null;
  return (
    <section className="mx-auto max-w-5xl px-6 py-[72px] lg:py-32">
      <h2 className="text-3xl font-bold text-bm-black">{t.home.destinationsTitle}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {destinations.map((destination) => (
          <article key={destination.id} className="overflow-hidden rounded-card bg-white shadow-hairline transition hover:shadow-lift">
            <SmartGallery
              entityType="destinations"
              entityId={destination.id}
              locale={locale}
              variant="hover"
              aspect="4 / 3"
              sizes="(min-width: 1024px) 25vw, 50vw"
            />
            <div className="p-4">
              <h3 className="font-bold text-bm-black">{pickLang(destination, 'name', locale)}</h3>
              {pickLang(destination, 'tagline', locale) ? (
                <p className="accent-line mt-1 text-sm text-bm-black/60">{pickLang(destination, 'tagline', locale)}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

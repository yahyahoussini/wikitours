import Image from 'next/image';
import Link from 'next/link';
import { getDictionary, pickLang } from '@/lib/i18n';
import { getGallerySlides, getTestimonialMedia } from '@/lib/data/gallery';
import { SETTINGS_HERO_ENTITY_ID, SETTINGS_TEAM_ENTITY_ID, SETTINGS_WHY_ENTITY_ID } from '@/lib/entities';
import { publicMediaUrl } from '@/lib/media';
import { BLUR_DATA_URL } from '@/lib/blur';
import { OMRA_YEAR, MONTH_SLUGS, monthName } from '@/lib/months';
import BrandLockup from '@/components/site/BrandLockup';
import Icon from '@/components/site/Icon';
import SectionBridge from '@/components/site/SectionBridge';
import HeroSlideshow from '@/components/site/HeroSlideshow';
import ReelsRow from '@/components/site/ReelsRow';
import ScreenshotWall from '@/components/site/ScreenshotWall';
import TestimonialsCarousel from '@/components/site/TestimonialsCarousel';
import SmartGallery from '@/components/SmartGallery';
import HotelsGrid from '@/components/site/HotelsGrid';

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

        {/* Extra darkening directly behind the text column — the slideshow's
            own scrim keeps the whole photo legible; this isolates the text
            block specifically, so a busy sky/crowd never fights the copy. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[85%] bg-gradient-to-t from-bm-black/55 via-bm-black/15 to-transparent"
        />
        <div className="relative flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 py-20 text-center text-white">
          <span className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-shadow-photo backdrop-blur">
            {t.home.heroBadge}
          </span>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-shadow-photo sm:text-5xl">
            {t.home.heroLine1}
            <span className="accent-line mt-1 block font-normal text-bm-gold-light">
              {t.home.heroLine2}
            </span>
          </h1>
          <p data-answer className="max-w-xl text-white/85 text-shadow-photo">{t.home.intro}</p>
          <Link
            href={`/${locale}/bab-makka`}
            data-wt="cta_click"
            data-wt-label="hero"
            data-magnetic
            suppressHydrationWarning
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
  // Dedicated "Pourquoi nous" gallery first (admin-settable independently of
  // the hero); while it's empty, fall back to the hero's second image so the
  // band never loses its photo.
  const whySlides = await getGallerySlides('settings_why', SETTINGS_WHY_ENTITY_ID, locale);
  let frame = whySlides.find((s) => s.kind === 'image') ?? null;
  if (!frame) {
    const slides = await getGallerySlides('settings_hero', SETTINGS_HERO_ENTITY_ID, locale);
    frame = slides.filter((s) => s.kind === 'image')[1] ?? null;
  }

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
          <BrandLockup locale={locale} size="lg" />
          <h2 className="mt-5 text-3xl font-bold leading-tight">{t.home.whyTitle}</h2>
          <dl className="mt-8 grid grid-cols-2 gap-6">
            {stats.map(([value, label]) => (
              <div key={label} data-reveal suppressHydrationWarning>
                {/* wt-motion.js animates this number from 0, mutating the text
                    before React hydrates — suppress the expected text mismatch. */}
                <dt className="gold-shimmer text-3xl font-bold tabular-nums" data-count={value} suppressHydrationWarning>
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

  // Serialize for the client grid (LAWS §3: all cards stay in the served HTML).
  const cards = hotels.map((hotel) => {
    const cover = covers.get(hotel.id);
    return {
      id: hotel.id,
      slug: hotel.slug,
      name: hotel.name,
      stars: hotel.stars,
      city: hotel.city,
      distance_to_haram_m: hotel.distance_to_haram_m,
      cover: cover
        ? { src: publicMediaUrl(cover.path), alt: pickLang(cover, 'alt', locale) ?? null }
        : null,
    };
  });

  return (
    <section className="mx-auto max-w-5xl px-6 py-[72px] lg:py-32">
      <h2 className="text-3xl font-bold text-bm-black">{t.home.hotelsTitle}</h2>
      <p className="mt-3 max-w-2xl text-bm-black/60">{t.home.hotelsSubtitle}</p>
      <HotelsGrid
        hotels={cards}
        locale={locale}
        labels={{
          makkah: t.offer.makkah,
          madinah: t.offer.madinah,
          distanceToHaram: t.offer.distanceToHaram,
          loadMore: t.home.hotelsLoadMore,
        }}
      />
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

      {/* The 3 steps drawn as a traced route on a stylized map: numbered map
          pins joined by a dashed line that draws in — horizontal across the
          desktop row, vertical timeline on phone. */}
      <div
        className={`${dark ? 'map-canvas-dark border-white/10 bg-white/[0.03]' : 'map-canvas border-bm-black/10 bg-white'} relative mt-8 overflow-hidden rounded-panel border px-6 py-10 sm:px-10 lg:py-16`}
      >
        <ol className="relative grid gap-10 lg:grid-cols-3 lg:gap-5">
          {steps.map(([title, body], i) => {
            const last = i === steps.length - 1;
            return (
              <li
                key={title}
                data-reveal
                suppressHydrationWarning
                className="relative flex items-start gap-4 lg:flex-col lg:items-center lg:gap-5 lg:text-center"
              >
                {/* Route to the next pin — vertical (phone) / horizontal (desktop) */}
                {!last ? (
                  <>
                    <span
                      data-reveal
                      suppressHydrationWarning
                      aria-hidden="true"
                      className="map-trace-y absolute start-[15px] top-[17px] h-[calc(100%_+_2.5rem)] border-s-2 border-dashed border-bm-gold/45 lg:hidden"
                    />
                    <span
                      data-reveal
                      suppressHydrationWarning
                      aria-hidden="true"
                      className="map-trace-x absolute start-1/2 top-[17px] hidden w-[calc(100%_+_1.25rem)] border-t-2 border-dashed border-bm-gold/45 lg:block"
                    />
                  </>
                ) : null}

                {/* Map pin marker with the step number in its head */}
                <span className="relative z-[1] inline-flex h-11 w-8 shrink-0">
                  <svg
                    viewBox="0 0 24 34"
                    aria-hidden="true"
                    className="h-full w-full fill-bm-gold drop-shadow-[0_4px_8px_rgba(212,175,55,0.35)]"
                  >
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 8.4 8.7 18.6 11.1 21.3a1.2 1.2 0 0 0 1.8 0C15.3 30.6 24 20.4 24 12 24 5.373 18.627 0 12 0Z" />
                  </svg>
                  <span className="absolute left-1/2 top-[36%] -translate-x-1/2 -translate-y-1/2 text-sm font-extrabold text-bm-black">
                    {i + 1}
                  </span>
                </span>

                <div className="lg:mt-1">
                  <h3 className="font-bold">{title}</h3>
                  <p className={`mt-1 text-sm ${dark ? 'text-white/60' : 'text-bm-black/60'}`}>{body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* 7+8 — Proof: reels (dark) + screenshot wall + Google badge. `enterDark` means
   a dark surface (the stats band) sits directly above, so the leading
   light→dark bridge is skipped to keep one continuous dark cluster. */
export async function ProofSection({ locale, testimonials, settings, enterDark = false }) {
  const t = getDictionary(locale);
  // Media comes from each testimonial's gallery.
  const { reels, shots, texts } = await getTestimonialMedia(testimonials, locale);

  // Nothing to show — but if we arrived on a dark surface, still soften back to
  // light so the following light section doesn't hard-edge the dark cluster.
  if (!reels.length && !shots.length && !texts.length) {
    return enterDark ? <SectionBridge from="dark" to="light" /> : null;
  }

  return (
    <>
      {reels.length ? (
        <>
          {/* Already dark (stats above)? stay on it; otherwise dip into dark. */}
          {enterDark ? null : <SectionBridge from="light" to="dark" />}
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
      ) : enterDark ? (
        // No reels, but we entered on dark — close the surface before the wall.
        <SectionBridge from="dark" to="light" />
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
          <div className="mt-6">
            <TestimonialsCarousel
              items={texts.slice(0, 6).map((item) => ({
                id: item.id,
                rating: item.rating ?? null,
                content: pickLang(item, 'content', locale),
                author: item.author_name,
                city: item.author_city ?? null,
                trip: pickLang(item, 'trip_label', locale) ?? null,
              }))}
              labels={{ readMore: t.cta.readMore, close: t.a11y.close, goTo: t.a11y.goToSlide }}
            />
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

/* 11 — Notre histoire: admin-written story + team (individual members or one
   full-team photo). All content is admin-controlled (LAWS §3/§10). */
export async function StorySection({ locale, team, settings, fallbackStory = null }) {
  const t = getDictionary(locale);

  // The written story — blank-line-separated paragraphs, admin-editable. Falls
  // back to the provided copy (e.g. the site intro) so the section stays
  // visible before a custom story is written.
  const story = pickLang(settings, 'story', locale) || fallbackStory;
  const paragraphs = story
    ? story.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];

  const teamEnabled = settings?.team_enabled ?? true;
  const usePhoto = settings?.team_display === 'photo';

  // Resolve the team block: one full-team photo, or individual member faces.
  let teamPhoto = null;
  const faces = new Map();
  if (teamEnabled && usePhoto) {
    const slides = await getGallerySlides('settings_team', SETTINGS_TEAM_ENTITY_ID, locale);
    teamPhoto = slides.find((s) => s.kind === 'image') ?? null;
  } else if (teamEnabled && team.length) {
    for (const member of team) {
      const slides = await getGallerySlides('team_members', member.id, locale);
      const face = slides.find((s) => s.kind === 'image');
      if (face) faces.set(member.id, face);
    }
  }

  const showMembers = teamEnabled && !usePhoto && team.length > 0;
  const showTeam = Boolean(teamEnabled && (teamPhoto || showMembers));

  if (!paragraphs.length && !showTeam) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 py-[72px] lg:py-32">
      <h2 className="text-3xl font-bold text-bm-black">{t.home.storyTitle}</h2>
      <div className={`mt-6 grid gap-10 ${showTeam ? 'lg:grid-cols-2' : ''}`}>
        {paragraphs.length ? (
          <div data-reveal suppressHydrationWarning className="max-w-2xl space-y-4 text-[15px] leading-relaxed text-bm-black/70">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : null}

        {teamPhoto ? (
          <figure data-reveal suppressHydrationWarning className="self-start">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-panel bg-bm-black/5 shadow-hairline">
              <Image
                src={teamPhoto.src}
                alt={teamPhoto.alt || t.home.storyTitle}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                loading="lazy"
                className="object-cover"
              />
            </div>
          </figure>
        ) : showMembers ? (
          <div className="grid grid-cols-2 gap-4 self-start sm:grid-cols-3">
            {team.map((member) => {
              const face = faces.get(member.id);
              return (
                <figure key={member.id} data-reveal suppressHydrationWarning className="text-center">
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
export function BlogTeasers({ locale, articles, covers }) {
  const t = getDictionary(locale);
  if (!articles.length) return null;
  return (
    <section className="mx-auto max-w-5xl px-6 py-[72px] lg:py-32">
      <h2 className="text-3xl font-bold text-bm-black">{t.home.blogTitle}</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {articles.slice(0, 3).map((article) => {
          // Cover = first image of the article's gallery (admin-uploaded).
          const cover = covers?.get(article.id);
          const title = pickLang(article, 'title', locale);
          return (
            <Link
              key={article.id}
              data-reveal
              suppressHydrationWarning
              href={`/${locale}/blog/${article.slug}`}
              className="group overflow-hidden rounded-card bg-white shadow-hairline transition hover:shadow-lift"
            >
              <div className="relative aspect-[16/10] bg-bm-black/5">
                {cover ? (
                  <Image
                    src={publicMediaUrl(cover.path)}
                    alt={pickLang(cover, 'alt', locale) ?? title ?? ''}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    className="object-cover transition duration-500 ease-luxe group-hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-wiki-blue">{article.category}</p>
                <h3 className="mt-2 font-bold leading-snug text-bm-black group-hover:text-wiki-blue">
                  {title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-bm-black/60">{pickLang(article, 'excerpt', locale)}</p>
                <p className="mt-3 text-xs font-semibold text-bm-gold">{t.cta.readMore} →</p>
              </div>
            </Link>
          );
        })}
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

/* 15 — Final CTA with the serif-accent labbayk line */
export function FinalCta({ locale }) {
  const t = getDictionary(locale);
  return (
    <section className="bg-bm-black text-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-20 text-center">
        <p className="accent-line text-3xl text-bm-gold-light sm:text-4xl">{t.home.finalCtaLine}</p>
        <p className="text-white/70">{t.home.finalCtaSub}</p>
        <Link
          href={`/${locale}/bab-makka`}
          data-wt="cta_click"
          data-wt-label="final"
          className="cta-shine cta-press rounded-full bg-wiki-blue px-8 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
        >
          {t.cta.reserve}
        </Link>
        <BrandLockup locale={locale} size="lg" className="mt-4 opacity-90" />
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

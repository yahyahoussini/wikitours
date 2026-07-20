import { Montserrat, Inter, Tajawal } from 'next/font/google';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { SITE_URL, parseVerificationMetas, clampDesc } from '@/lib/seo';
import { getSettings } from '@/lib/data/settings';
import { LOCALES, isLocale, getDictionary, dirFor } from '@/lib/i18n';
import { EXT_ATTR_CLEANER } from '@/lib/ext-attr-cleaner';
import AnnouncementBar from '@/components/AnnouncementBar';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import TrackingScripts from '@/components/TrackingScripts';
import ConsentBanner from '@/components/ConsentBanner';
import HydrationSignal from '@/components/HydrationSignal';
import NavigationOverlay from '@/components/site/NavigationOverlay';
import OrgJsonLd from '@/components/site/OrgJsonLd';
import '../globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Declared at module scope (next/font requirement) but its class — and thus
// the font download — is only applied on Arabic pages. Two weights only:
// CSS weight matching resolves 500/600 to the nearest loaded weight, so the
// medium file was pure payload.
const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-tajawal',
  display: 'swap',
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  // Search Console / Bing verification. These were admin-editable but never
  // rendered, so verification silently failed — hence the site could not be
  // claimed. getSettings is request-cached (OrgJsonLd already calls it).
  const settings = await getSettings();
  const verificationMetas = parseVerificationMetas(settings?.verification_metas);
  return {
    metadataBase: new URL(SITE_URL),
    ...(verificationMetas.length
      ? { verification: { other: Object.fromEntries(verificationMetas.map((m) => [m.name, m.content])) } }
      : {}),
    title: {
      default: t.home.metaTitle,
      template: `%s — ${BRAND.parent}`,
    },
    // Default description = THE canonical entity string (same verbatim text as
    // Organization.description and llms.txt — entity consistency). Pages with
    // their own description override it.
    description: clampDesc(t.brand.description),
    openGraph: {
      // OG site_name carries the exact BRAND.lockup string (LAWS §1).
      siteName: BRAND.lockup,
      locale,
      type: 'website',
    },
    // The image itself comes from the opengraph-image routes; X/Twitter reads
    // og:image, so the card type is all that's needed here.
    twitter: { card: 'summary_large_image' },
    icons: {
      icon: '/brand/favicon.ico',
      apple: '/brand/apple-touch-icon.png',
    },
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const fontClasses = [
    montserrat.variable,
    inter.variable,
    locale === 'ar' ? tajawal.variable : null,
  ]
    .filter(Boolean)
    .join(' ');

  const t = getDictionary(locale);

  return (
    // suppressHydrationWarning: browser extensions (password managers, form
    // fillers) inject attributes onto <html>/<body> before React hydrates —
    // this silences that one-level-deep false positive without hiding real
    // mismatches inside the tree.
    <html lang={locale} dir={dirFor(locale)} className={fontClasses} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {/* Strip extension-injected attributes before React's hydration diff */}
        <script dangerouslySetInnerHTML={{ __html: EXT_ATTR_CLEANER }} />
        {/* Mark motion-capable before first paint so reveals don't flash. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js-motion')" }} />
        {/* Admin-driven pixels (GA4/Meta/TikTok) — consent-gated when enabled */}
        <TrackingScripts />
        {/* Sitewide organization entity (TravelAgency) — one per page */}
        <OrgJsonLd locale={locale} />
        <AnnouncementBar locale={locale} />
        <SiteHeader locale={locale} />
        {children}
        <SiteFooter locale={locale} />
        <ConsentBanner labels={t.consent} />
        {/* Gates wt-motion's DOM writes behind hydration commit */}
        <HydrationSignal />
        {/* Branded transition overlay — click-based, not loading.js (see its own comment) */}
        <NavigationOverlay />
        {/* First-party beacon — deferred, ~1.6KB gzipped, public pages only */}
        <script src="/wt.js" defer />
        {/* Shared motion utility — reveal + scroll-progress + magnetic (no libs) */}
        <script src="/wt-motion.js" defer />
      </body>
    </html>
  );
}

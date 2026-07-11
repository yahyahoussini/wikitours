import { Montserrat, Inter, Playfair_Display, Tajawal } from 'next/font/google';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { SITE_URL } from '@/lib/seo';
import { LOCALES, isLocale, getDictionary, dirFor } from '@/lib/i18n';
import AnnouncementBar from '@/components/AnnouncementBar';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import TrackingScripts from '@/components/TrackingScripts';
import ConsentBanner from '@/components/ConsentBanner';
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

const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['italic'],
  variable: '--font-playfair',
  display: 'swap',
});

// Declared at module scope (next/font requirement) but its class — and thus
// the font download — is only applied on Arabic pages.
const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t.home.metaTitle,
      template: `%s — ${BRAND.parent}`,
    },
    openGraph: {
      // OG site_name carries the exact BRAND.lockup string (LAWS §1).
      siteName: BRAND.lockup,
      locale,
      type: 'website',
    },
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const fontClasses = [
    montserrat.variable,
    inter.variable,
    playfair.variable,
    locale === 'ar' ? tajawal.variable : null,
  ]
    .filter(Boolean)
    .join(' ');

  const t = getDictionary(locale);

  return (
    <html lang={locale} dir={dirFor(locale)} className={fontClasses}>
      <body className="antialiased">
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
        {/* First-party beacon — deferred, ~1.6KB gzipped, public pages only */}
        <script src="/wt.js" defer />
        {/* Shared motion utility — reveal + scroll-progress + magnetic (no libs) */}
        <script src="/wt-motion.js" defer />
      </body>
    </html>
  );
}

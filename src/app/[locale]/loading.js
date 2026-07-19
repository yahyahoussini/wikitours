import BrandLoader from '@/components/site/BrandLoader';

/** Route-transition screen for the public site (client-side navigations only —
 *  crawlers and first visits always get full ISR HTML). Wiki Tours branding;
 *  Bab Makka surfaces override with their own loading.js. */
export default function Loading() {
  return <BrandLoader />;
}

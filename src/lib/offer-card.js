import { publicMediaUrl } from '@/lib/media';
import { pickLang } from '@/lib/i18n';

/**
 * Narrow an offers row (+ its cover row) to exactly what the client
 * <OfferCard>/<PackagesSection> render. The raw row carries ~12 long-text
 * columns × 3 locales, and each tier embeds two COMPLETE hotel rows — passed
 * as-is across the client boundary they are all serialized into every page's
 * RSC payload. Keep this in sync with OfferCard's field reads.
 */
function slimHotel(hotel) {
  if (!hotel) return null;
  return {
    name: hotel.name,
    logo_path: hotel.logo_path ?? null,
    distance_to_haram_m: hotel.distance_to_haram_m ?? null,
  };
}

function slimTier(tier) {
  return {
    label: tier.label ?? null,
    price_double: tier.price_double ?? null,
    price_triple: tier.price_triple ?? null,
    price_quad: tier.price_quad ?? null,
    price_quint: tier.price_quint ?? null,
    breakfast_included: tier.breakfast_included ?? null,
    distance_to_haram_m: tier.distance_to_haram_m ?? null,
    hotel_makkah: slimHotel(tier.hotel_makkah),
  };
}

export function toOfferCard(offer, cover, locale) {
  return {
    id: offer.id,
    slug: offer.slug,
    status: offer.status,
    date_start: offer.date_start,
    date_end: offer.date_end,
    duration_days: offer.duration_days,
    duration_nights: offer.duration_nights,
    airline: offer.airline,
    land_only: offer.land_only,
    starting_price: offer.starting_price ?? null,
    tier_label: offer.tier_label ?? null,
    title_fr: offer.title_fr,
    title_ar: offer.title_ar,
    title_en: offer.title_en,
    // Legacy pre-tiers price fallback used by cheapestCombo()
    price_double: offer.price_double ?? null,
    price_triple: offer.price_triple ?? null,
    price_quad: offer.price_quad ?? null,
    price_quint: offer.price_quint ?? null,
    occasion: offer.occasion
      ? {
          slug: offer.occasion.slug,
          name_fr: offer.occasion.name_fr,
          name_ar: offer.occasion.name_ar,
          name_en: offer.occasion.name_en,
        }
      : null,
    hotel_makkah: slimHotel(offer.hotel_makkah),
    tiers: (offer.tiers ?? []).map(slimTier),
    cover: cover
      ? { src: publicMediaUrl(cover.path), alt: pickLang(cover, 'alt', locale) }
      : null,
  };
}

import { cache } from 'react';
import { supabasePublic } from '@/lib/supabase/public';

/**
 * Public content reads — anon client, RLS keeps them to published rows only
 * (past offers are hidden at the DB layer). Every helper returns null/[] on
 * failure so sections hide (LAWS §10).
 */

const LEGACY_PRICE_KEYS = ['price_double', 'price_triple', 'price_quad', 'price_quint'];

/**
 * Build a one-element tiers array from an offer's legacy per-offer columns
 * (price_*, hotel_makkah_id/hotel_madinah_id, tier_label) so offers that predate
 * the offer_tiers model — or that haven't been split into gammes yet — still
 * show prices and hotels instead of a blank booking block. Returns [] when the
 * offer carries neither a legacy price nor a legacy hotel.
 */
async function legacyTierFromOffer(supabase, offer) {
  const hasPrice = LEGACY_PRICE_KEYS.some((k) => typeof offer[k] === 'number' && offer[k] > 0);
  const hotelIds = [offer.hotel_makkah_id, offer.hotel_madinah_id].filter(Boolean);
  if (!hasPrice && hotelIds.length === 0) return [];

  const hotelsById = {};
  if (hotelIds.length) {
    const { data: hotelRows } = await supabase.from('hotels').select('*').in('id', hotelIds);
    for (const h of hotelRows ?? []) hotelsById[h.id] = h;
  }

  return [
    {
      id: 'legacy',
      offer_id: offer.id,
      sort_order: 0,
      // A single implicit gamme; label drives the badge + CSS selection key.
      label: offer.tier_label || 'confort',
      hotel_makkah_id: offer.hotel_makkah_id ?? null,
      hotel_madinah_id: offer.hotel_madinah_id ?? null,
      hotel_makkah: offer.hotel_makkah_id ? hotelsById[offer.hotel_makkah_id] ?? null : null,
      hotel_madinah: offer.hotel_madinah_id ? hotelsById[offer.hotel_madinah_id] ?? null : null,
      nights_makkah: null,
      nights_madinah: null,
      distance_to_haram_m: null,
      breakfast_included: false,
      price_double: offer.price_double ?? null,
      price_triple: offer.price_triple ?? null,
      price_quad: offer.price_quad ?? null,
      price_quint: offer.price_quint ?? null,
      is_published: true,
      _legacy: true,
    },
  ];
}

export const getOfferBySlug = cache(async function getOfferBySlug(slug) {
  try {
    const supabase = supabasePublic();
    if (!supabase || !slug) return null;
    const { data, error } = await supabase
      .from('offers')
      .select(
        '*, occasion:occasion_id (slug, name_fr, name_ar, name_en)',
      )
      .eq('slug', slug)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    // Fetch tiers
    const { data: tiersData } = await supabase
      .from('offer_tiers')
      .select('*, hotel_makkah:hotel_makkah_id (*), hotel_madinah:hotel_madinah_id (*)')
      .eq('offer_id', data.id)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });
    let tiers = tiersData ?? [];
    if (tiers.length === 0) tiers = await legacyTierFromOffer(supabase, data);

    const prices = [];
    for (const tier of tiers) {
      for (const key of LEGACY_PRICE_KEYS) {
        if (typeof tier[key] === 'number' && tier[key] > 0) prices.push(tier[key]);
      }
    }
    data.starting_price = prices.length ? Math.min(...prices) : (data.starting_price ?? null);
    return { ...data, tiers };
  } catch {
    return null;
  }
});

export const getHotelBySlug = cache(async function getHotelBySlug(slug) {
  try {
    const supabase = supabasePublic();
    if (!supabase || !slug) return null;
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
});

/** All published, future offers with occasion + tiers (RLS hides the past). */
export const getPublishedOffers = cache(async function getPublishedOffers() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    // RLS keeps departed offers readable for 60 days (grace, for the detail
    // page + cron). LISTINGS must stay future-only, so filter here explicitly.
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('offers')
      .select('*, occasion:occasion_id (id, slug, name_fr, name_ar, name_en, sort_order)')
      .or(`date_end.gte.${today},date_end.is.null`)
      .order('is_featured', { ascending: false })
      .order('date_start', { ascending: true });
    if (error) return [];
    const offers = data ?? [];
    // Fetch tiers for all offers
    const offerIds = offers.map((o) => o.id);
    if (offerIds.length) {
      const { data: tiers } = await supabase
        .from('offer_tiers')
        .select('*, hotel_makkah:hotel_makkah_id (*), hotel_madinah:hotel_madinah_id (*)')
        .in('offer_id', offerIds)
        .eq('is_published', true)
        .order('sort_order', { ascending: true });
      const tierMap = {};
      for (const t of tiers ?? []) {
        if (!tierMap[t.offer_id]) tierMap[t.offer_id] = [];
        tierMap[t.offer_id].push(t);
      }
      for (const offer of offers) {
        offer.tiers = tierMap[offer.id] ?? [];
        // Compute starting_price from tiers for backward compat
        const prices = [];
        for (const tier of offer.tiers) {
          for (const key of ['price_double', 'price_triple', 'price_quad', 'price_quint']) {
            if (typeof tier[key] === 'number' && tier[key] > 0) prices.push(tier[key]);
          }
        }
        offer.starting_price = prices.length ? Math.min(...prices) : (offer.starting_price ?? null);
      }
    }
    return offers;
  } catch {
    return [];
  }
});

export const getOccasions = cache(async function getOccasions() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data } = await supabase.from('occasions').select('*').order('sort_order');
    return data ?? [];
  } catch {
    return [];
  }
});

export const getHotels = cache(async function getHotels() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data } = await supabase.from('hotels').select('*').order('distance_to_haram_m');
    return data ?? [];
  } catch {
    return [];
  }
});

export const getTeam = cache(async function getTeam() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data } = await supabase.from('team_members').select('*').order('sort_order');
    return data ?? [];
  } catch {
    return [];
  }
});

export const getTestimonials = cache(async function getTestimonials() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data } = await supabase.from('testimonials').select('*').order('sort_order');
    return data ?? [];
  } catch {
    return [];
  }
});

export const getFaqs = cache(async function getFaqs(category) {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    let query = supabase.from('faqs').select('*').order('sort_order');
    if (category) query = query.eq('category', category);
    const { data } = await query;
    return data ?? [];
  } catch {
    return [];
  }
});

export const getArticles = cache(async function getArticles(limit = 50) {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data } = await supabase
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
});

export const getArticleBySlug = cache(async function getArticleBySlug(slug) {
  try {
    const supabase = supabasePublic();
    if (!supabase || !slug) return null;
    const { data } = await supabase.from('articles').select('*').eq('slug', slug).maybeSingle();
    return data;
  } catch {
    return null;
  }
});

export const getServices = cache(async function getServices() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data } = await supabase.from('services').select('*').order('sort_order');
    return data ?? [];
  } catch {
    return [];
  }
});

export const getMenu = cache(async function getMenu(location) {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data } = await supabase
      .from('menus')
      .select('id, label_fr, label_ar, label_en, href, sort_order')
      .eq('location', location)
      .order('sort_order');
    return data ?? [];
  } catch {
    return [];
  }
});

/** Cover image (first gallery item) for many records at once: Map(id → slide). */
export const getCovers = cache(async function getCovers(entityType, ids) {
  try {
    const supabase = supabasePublic();
    if (!supabase || !ids?.length) return new Map();
    const { data } = await supabase
      .from('galleries')
      .select('entity_id, sort_order, media:media_id (path, kind, alt_fr, alt_ar, alt_en, width, height)')
      .eq('entity_type', entityType)
      .in('entity_id', ids)
      .order('sort_order');
    const covers = new Map();
    for (const item of data ?? []) {
      if (!covers.has(item.entity_id) && item.media?.kind === 'image') {
        covers.set(item.entity_id, item.media);
      }
    }
    return covers;
  } catch {
    return new Map();
  }
});

/** Published, indexable landing pages (for the sitemap). noindex ones excluded. */
export const getIndexableLandingPages = cache(async function getIndexableLandingPages() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('landing_pages')
      .select('slug, updated_at, noindex')
      .neq('noindex', true);
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
});

/** Compute the minimum price per person across all tiers and room types. */
export function computeMinPrice(tiers) {
  if (!tiers?.length) return null;
  const all = [];
  for (const tier of tiers) {
    for (const key of ['price_double', 'price_triple', 'price_quad', 'price_quint']) {
      if (typeof tier[key] === 'number' && tier[key] > 0) all.push(tier[key]);
    }
  }
  return all.length ? Math.min(...all) : null;
}

export const getDestinations = cache(async function getDestinations() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
});

/** All city-page rows keyed by slug (sitemap indexability decisions). */
export const getCityPages = cache(async function getCityPages() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return new Map();
    const { data, error } = await supabase.from('city_pages').select('*');
    if (error) return new Map();
    return new Map((data ?? []).map((row) => [row.slug, row]));
  } catch {
    return new Map();
  }
});

/** City-page guard row (/omra-depuis-{ville}) — null when the admin hasn't
 *  created it yet (the page then renders generic + noindex). */
export const getCityPage = cache(async function getCityPage(slug) {
  try {
    const supabase = supabasePublic();
    if (!supabase || !slug) return null;
    const { data, error } = await supabase
      .from('city_pages')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
});

/** Published guide-cluster rows keyed by slug (pillar + children). */
export const getGuidePages = cache(async function getGuidePages() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return new Map();
    const { data, error } = await supabase.from('guide_pages').select('*');
    if (error) return new Map();
    return new Map((data ?? []).map((row) => [row.slug, row]));
  } catch {
    return new Map();
  }
});

/** Published glossary terms, ordered. */
export const getGlossaryTerms = cache(async function getGlossaryTerms() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('glossary_terms')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
});

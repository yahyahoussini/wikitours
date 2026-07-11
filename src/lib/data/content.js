import { cache } from 'react';
import { supabasePublic } from '@/lib/supabase/public';

/**
 * Public content reads — anon client, RLS keeps them to published rows only
 * (past offers are hidden at the DB layer). Every helper returns null/[] on
 * failure so sections hide (LAWS §10).
 */

export const getOfferBySlug = cache(async function getOfferBySlug(slug) {
  try {
    const supabase = supabasePublic();
    if (!supabase || !slug) return null;
    const { data, error } = await supabase
      .from('offers')
      .select(
        '*, occasion:occasion_id (slug, name_fr, name_ar, name_en), hotel_makkah:hotel_makkah_id (*), hotel_madinah:hotel_madinah_id (*)',
      )
      .eq('slug', slug)
      .maybeSingle();
    if (error) return null;
    return data;
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

/** All published, future offers with occasion + hotels (RLS hides the past). */
export const getPublishedOffers = cache(async function getPublishedOffers() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('offers')
      .select('*, occasion:occasion_id (id, slug, name_fr, name_ar, name_en, sort_order), hotel_makkah:hotel_makkah_id (*), hotel_madinah:hotel_madinah_id (*)')
      .order('is_featured', { ascending: false })
      .order('date_start', { ascending: true });
    if (error) return [];
    return data ?? [];
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

export const getTimeline = cache(async function getTimeline() {
  try {
    const supabase = supabasePublic();
    if (!supabase) return [];
    const { data } = await supabase.from('timeline_items').select('*').order('sort_order');
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

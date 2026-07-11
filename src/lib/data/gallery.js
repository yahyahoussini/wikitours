import { cache } from 'react';
import { supabasePublic } from '@/lib/supabase/public';
import { publicMediaUrl } from '@/lib/media';
import { pickLang } from '@/lib/i18n';

/**
 * Public gallery slides for one entity, ordered, mapped to plain objects a
 * client component can receive. Anon client + RLS; empty array on any
 * failure so the section hides (LAWS §10).
 */
export const getGallerySlides = cache(async function getGallerySlides(
  entityType,
  entityId,
  locale,
) {
  try {
    const supabase = supabasePublic();
    if (!supabase || !entityId) return [];

    const { data, error } = await supabase
      .from('galleries')
      .select('id, sort_order, media:media_id (id, path, kind, alt_fr, alt_ar, alt_en, width, height)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('sort_order', { ascending: true });
    if (error || !data) return [];

    const slides = data
      .filter((item) => item.media && item.media.kind !== 'document')
      .map((item) => ({
        id: item.id,
        kind: item.media.kind,
        src: publicMediaUrl(item.media.path),
        alt: pickLang(item.media, 'alt', locale) ?? '',
        width: item.media.width,
        height: item.media.height,
      }))
      .filter((s) => s.src);

    // Videos borrow the cover image as poster when one exists.
    const coverImage = slides.find((s) => s.kind === 'image');
    for (const s of slides) {
      if (s.kind === 'video' && coverImage) s.poster = coverImage.src;
    }
    return slides;
  } catch {
    return [];
  }
});

/**
 * Splits published testimonials into the three proof registers and resolves
 * their gallery media: video kinds → reels, screenshot kinds → wall shots.
 * Shared by the home ProofSection, /avis and the Casablanca landing.
 */
export async function getTestimonialMedia(testimonials, locale) {
  const reels = [];
  for (const item of testimonials.filter((x) => x.kind === 'video')) {
    const slides = await getGallerySlides('testimonials', item.id, locale);
    const video = slides.find((s) => s.kind === 'video');
    if (video) {
      reels.push({ id: item.id, src: video.src, poster: video.poster ?? null, caption: item.author_name });
    }
  }
  const shots = [];
  for (const item of testimonials.filter((x) => x.kind === 'screenshot')) {
    const slides = await getGallerySlides('testimonials', item.id, locale);
    for (const s of slides.filter((x) => x.kind === 'image')) {
      shots.push({ id: `${item.id}-${s.id}`, src: s.src, alt: s.alt, width: s.width, height: s.height });
    }
  }
  return { reels, shots, texts: testimonials.filter((x) => x.kind === 'text') };
}

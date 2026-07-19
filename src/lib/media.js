/**
 * Shared media constants — safe for client and server bundles.
 * Server-side validation (magic bytes, dimensions) lives in
 * lib/server/media-validation.js and must never be imported client-side.
 */

export const MEDIA_BUCKET = 'public-images';

/** Per-kind size limits in bytes (LAWS: images ≤4MB, mp4 ≤15MB, pdf ≤10MB). */
export const MEDIA_LIMITS = {
  image: 4 * 1024 * 1024,
  video: 15 * 1024 * 1024,
  document: 10 * 1024 * 1024,
};

/** For <input accept> — the server re-validates by magic bytes regardless. */
export const MEDIA_ACCEPT =
  'image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,application/pdf';

/** Public URL of a stored object (the bucket is public-read). */
export function publicMediaUrl(path) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

/**
 * Resized URL via Supabase's render endpoint. Uploads are stored as .webp and
 * next/og (Satori) CANNOT decode WebP — it throws and the whole OG card fails.
 * The render endpoint content-negotiates, so a server-side fetch (no
 * `Accept: image/webp`) gets JPEG back, already scaled to the requested box.
 * Use this for OG cards; use publicMediaUrl for anything a browser loads.
 */
export function publicMediaRenderUrl(path, { width, height, resize = 'cover' } = {}) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  const params = new URLSearchParams({ resize });
  if (width) params.set('width', String(width));
  if (height) params.set('height', String(height));
  return `${base}/storage/v1/render/image/public/${MEDIA_BUCKET}/${path}?${params}`;
}

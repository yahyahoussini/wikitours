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
  'image/jpeg,image/png,image/webp,image/gif,video/mp4,application/pdf';

/** Public URL of a stored object (the bucket is public-read). */
export function publicMediaUrl(path) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

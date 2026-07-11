/**
 * Shared blur-up placeholder for next/image (craft rule B11). A tiny inline
 * SVG (a neutral warm tone) shown blurred then sharpened by next/image while
 * the real image loads — no per-image pipeline dependency. Used with
 * placeholder="blur" on gallery/cover images. Pre-encoded literal so it's safe
 * in both server and client bundles (no Buffer at runtime).
 */
export const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMCI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjYjhiMmE4Ii8+PC9zdmc+';

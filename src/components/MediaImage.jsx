'use client';

import Image from 'next/image';
import { mediaLoader } from '@/lib/media';

/**
 * next/image for LIBRARY media (anything under the Supabase public bucket).
 * It applies `mediaLoader` (src/lib/media.js): AVIF sources are resized by
 * Supabase's render endpoint — Vercel's optimizer passes AVIF through at its
 * source size — and every other source keeps the default /_next/image path.
 *
 * A client component on purpose: a `loader` function cannot cross the
 * server → client boundary, so a server component (SmartGallery, the home
 * sections, the team and voyages pages) renders this instead of
 * <Image loader={…}>. Brand assets under /public keep using <Image> directly.
 */
export default function MediaImage(props) {
  return <Image loader={mediaLoader} {...props} />;
}

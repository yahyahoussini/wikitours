import { notFound } from 'next/navigation';

// Catch-all for unmatched routes inside a locale (and for invalid-locale
// rewrites from the middleware) — renders the localized 404 with a 404 status.
// notFound() must ALSO fire in the metadata phase: metadata resolves before
// streaming, so the response carries a real 404 status instead of a 200 with
// 404 UI inside (the loading.js boundary otherwise commits the 200 first).
export function generateMetadata() {
  notFound();
}

export default function CatchAll() {
  notFound();
}

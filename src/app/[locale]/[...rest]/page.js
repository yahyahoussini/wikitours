import { notFound } from 'next/navigation';

// Catch-all for unmatched routes inside a locale (and for invalid-locale
// rewrites from the middleware) — renders the localized 404 with a 404 status.
export default function CatchAll() {
  notFound();
}

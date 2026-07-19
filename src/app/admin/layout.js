import { BRAND } from '@/lib/brand';
import { EXT_ATTR_CLEANER } from '@/lib/ext-attr-cleaner';
import '../globals.css';

export const metadata = {
  title: `Admin — ${BRAND.parent}`,
  robots: { index: false, follow: false },
};

/**
 * Root layout of the non-localized admin area (French UI). Auth is enforced
 * by the (protected) group layout so /admin/login stays reachable.
 */
export default function AdminRootLayout({ children }) {
  return (
    // suppressHydrationWarning: browser extensions (password managers, form
    // fillers) inject attributes onto <html>/<body> before React hydrates —
    // same false positive the public layout silences.
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <body className="min-h-dvh bg-wiki-white text-bm-black antialiased" suppressHydrationWarning>
        {/* Strip extension-injected attributes before React's hydration diff */}
        <script dangerouslySetInnerHTML={{ __html: EXT_ATTR_CLEANER }} />
        {children}
      </body>
    </html>
  );
}

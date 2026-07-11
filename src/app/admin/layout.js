import { BRAND } from '@/lib/brand';
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
    <html lang="fr" dir="ltr">
      <body className="min-h-dvh bg-wiki-white text-bm-black antialiased">
        {children}
      </body>
    </html>
  );
}

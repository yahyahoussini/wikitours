import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { supabaseServer } from '@/lib/supabase/server';
import { signOut } from '@/app/admin/actions';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/offres', label: 'Offres' },
  { href: '/admin/e/occasions', label: 'Occasions' },
  { href: '/admin/e/hotels', label: 'Hôtels' },
  { href: '/admin/e/destinations', label: 'Destinations' },
  { href: '/admin/e/temoignages', label: 'Témoignages' },
  { href: '/admin/e/faqs', label: 'FAQs' },
  { href: '/admin/e/articles', label: 'Articles' },
  { href: '/admin/e/landing-pages', label: 'Landing Pages' },
  { href: '/admin/e/services', label: 'Services (Voyages)' },
  { href: '/admin/media', label: 'Médias' },
  { href: '/admin/e/annonces', label: 'Annonces' },
  { href: '/admin/e/menus', label: 'Menus' },
  { href: '/admin/e/equipe', label: 'Équipe' },
  { href: '/admin/e/timeline', label: 'Timeline' },
  { href: '/admin/crm', label: 'CRM (Leads)' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/seo', label: 'SEO' },
  { href: '/admin/e/redirections', label: 'Redirections' },
  { href: '/admin/reglages', label: 'Réglages' },
];

export default async function AdminProtectedLayout({ children }) {
  const auth = await supabaseServer();
  if (!auth) redirect('/admin/login');
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect('/admin/login');

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-52 shrink-0 flex-col border-e border-bm-black/10 bg-white lg:flex">
        <Link href="/admin" className="px-4 py-4 text-sm font-bold tracking-wide">
          {BRAND.parent}
          <span className="block text-xs font-semibold text-wiki-blue">Admin</span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-ctrl px-3 py-1.5 text-sm text-bm-black/70 transition hover:bg-wiki-blue/10 hover:text-bm-black"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="border-t border-bm-black/10 p-3">
          <button type="submit" className="w-full rounded-ctrl px-3 py-1.5 text-start text-sm text-bm-black/60 transition hover:bg-bm-black/5">
            Déconnexion
          </button>
        </form>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Small screens: horizontal scroll nav */}
        <header className="sticky top-0 z-40 border-b border-bm-black/10 bg-white/90 backdrop-blur lg:hidden">
          <nav className="flex items-center gap-1 overflow-x-auto px-4 py-2 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-ctrl px-2.5 py-1 hover:bg-wiki-blue/10">
                {item.label}
              </Link>
            ))}
            <form action={signOut}>
              <button type="submit" className="whitespace-nowrap px-2.5 py-1 text-bm-black/50">
                Déconnexion
              </button>
            </form>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

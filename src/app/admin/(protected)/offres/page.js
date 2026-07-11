import { supabaseServer } from '@/lib/supabase/server';
import OffersBoard from '@/components/admin/OffersBoard';

export const dynamic = 'force-dynamic';

export default async function AdminOffersPage() {
  const sb = await supabaseServer();
  let groups = [];

  if (sb) {
    const [{ data: occasions }, { data: offers }] = await Promise.all([
      sb.from('occasions').select('id, name_fr, sort_order').order('sort_order'),
      sb.from('offers').select('*').order('date_start', { ascending: true }),
    ]);
    const byOccasion = new Map((occasions ?? []).map((o) => [o.id, { ...o, offers: [] }]));
    const orphans = { id: null, name_fr: null, offers: [] };
    for (const offer of offers ?? []) {
      (byOccasion.get(offer.occasion_id) ?? orphans).offers.push(offer);
    }
    groups = [...byOccasion.values(), orphans]
      .filter((g) => g.offers.length > 0)
      .map((g) => ({ id: g.id, name: g.name_fr, offers: g.offers }));
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Offres</h1>
      <OffersBoard groups={groups} />
    </div>
  );
}

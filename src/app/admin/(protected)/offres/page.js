import { supabaseServer } from '@/lib/supabase/server';
import OffersBoard from '@/components/admin/OffersBoard';

export const dynamic = 'force-dynamic';

function computeMinPrice(tiers) {
  if (!tiers?.length) return null;
  const all = [];
  for (const tier of tiers) {
    for (const key of ['price_double', 'price_triple', 'price_quad', 'price_quint']) {
      if (typeof tier[key] === 'number' && tier[key] > 0) all.push(tier[key]);
    }
  }
  return all.length ? Math.min(...all) : null;
}

export default async function AdminOffersPage() {
  const sb = await supabaseServer();
  let groups = [];

  if (sb) {
    const [{ data: occasions }, { data: offers }, { data: allTiers }] = await Promise.all([
      sb.from('occasions').select('id, name_fr, sort_order').order('sort_order'),
      sb.from('offers').select('*').order('date_start', { ascending: true }),
      sb.from('offer_tiers').select('*'),
    ]);

    // Attach computed starting_price to each offer from its tiers
    const tierMap = {};
    for (const t of allTiers ?? []) {
      if (!tierMap[t.offer_id]) tierMap[t.offer_id] = [];
      tierMap[t.offer_id].push(t);
    }
    for (const offer of offers ?? []) {
      const tiers = tierMap[offer.id] ?? [];
      // Use old starting_price as fallback during migration
      offer.starting_price = computeMinPrice(tiers) ?? offer.starting_price ?? null;
    }

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

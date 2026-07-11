import { supabaseServer } from '@/lib/supabase/server';
import LeadsBoard from '@/components/admin/LeadsBoard';
import { LEAD_STATUSES } from '@/components/admin/LeadRow';

export const dynamic = 'force-dynamic';

export default async function AdminCrmPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    q: typeof params.q === 'string' ? params.q.trim() : '',
    status: LEAD_STATUSES.some((s) => s.value === params.status) ? params.status : '',
    source: typeof params.source === 'string' ? params.source : '',
    city: typeof params.city === 'string' ? params.city : '',
    offer: typeof params.offer === 'string' ? params.offer : '',
    from: typeof params.from === 'string' ? params.from : '',
    to: typeof params.to === 'string' ? params.to : '',
  };
  const view = params.view === 'board' ? 'board' : 'list';

  const sb = await supabaseServer();
  let leads = [];
  let filterOptions = { sources: [], cities: [], offers: [] };

  if (sb) {
    let query = sb.from('leads').select('*').order('created_at', { ascending: false }).limit(500);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.source) query = query.eq('utm_source', filters.source);
    if (filters.city) query = query.eq('city', filters.city);
    if (filters.offer) query = query.eq('offer_id', filters.offer);
    if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00Z`);
    if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59Z`);
    if (filters.q) {
      const like = `%${filters.q.replaceAll('%', '')}%`;
      query = query.or(`full_name.ilike.${like},phone.ilike.${like},city.ilike.${like},offer_title.ilike.${like}`);
    }
    const [{ data }, { data: allLeads }, { data: offers }] = await Promise.all([
      query,
      sb.from('leads').select('utm_source, city').limit(2000),
      sb.from('offers').select('id, title_fr').order('date_start', { ascending: false }).limit(100),
    ]);
    leads = data ?? [];
    filterOptions = {
      sources: [...new Set((allLeads ?? []).map((l) => l.utm_source).filter(Boolean))].sort(),
      cities: [...new Set((allLeads ?? []).map((l) => l.city).filter(Boolean))].sort(),
      offers: (offers ?? []).map((o) => ({ value: o.id, label: o.title_fr ?? o.id })),
    };
  }

  const exportQuery = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k !== 'q')),
  ).toString();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">CRM — Leads</h1>
      <LeadsBoard
        leads={leads}
        view={view}
        filters={filters}
        filterOptions={filterOptions}
        exportQuery={exportQuery}
      />
    </div>
  );
}

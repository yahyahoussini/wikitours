import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import LeadDetail from '@/components/admin/LeadDetail';

export const dynamic = 'force-dynamic';

export default async function AdminLeadPage({ params }) {
  const { id } = await params;
  const sb = await supabaseServer();
  if (!sb) notFound();

  const [{ data: lead }, { data: activities }, { data: settings }] = await Promise.all([
    sb.from('leads').select('*').eq('id', id).maybeSingle(),
    sb.from('lead_activities').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    sb.from('settings').select('gbp_review_url').eq('id', 1).maybeSingle(),
  ]);
  if (!lead) notFound();

  // Journey: every event of this visitor, chronological, with offer titles.
  let journey = null;
  if (lead.visitor_id) {
    const [{ data: events }, { data: sessions }] = await Promise.all([
      sb.from('events').select('id, ts, type, path, offer_id').eq('visitor_id', lead.visitor_id).order('ts', { ascending: true }).limit(300),
      sb.from('sessions').select('id, started_at, entry_path, referrer, utm_source, city, device').eq('visitor_id', lead.visitor_id).order('started_at', { ascending: true }).limit(20),
    ]);
    const offerIds = [...new Set((events ?? []).map((e) => e.offer_id).filter(Boolean))];
    let titles = new Map();
    if (offerIds.length) {
      const { data: offers } = await sb.from('offers').select('id, title_fr').in('id', offerIds);
      titles = new Map((offers ?? []).map((o) => [o.id, o.title_fr]));
    }
    journey = {
      sessions: sessions ?? [],
      events: (events ?? []).map((e) => ({ ...e, offer_title: e.offer_id ? titles.get(e.offer_id) : null })),
    };
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/crm" className="text-sm text-bm-black/50 hover:text-bm-black">
          ← CRM
        </Link>
        <h1 className="mt-1 text-xl font-bold">{lead.full_name}</h1>
      </div>
      <LeadDetail
        lead={lead}
        activities={activities ?? []}
        journey={journey}
        gbpReviewUrl={settings?.gbp_review_url ?? null}
      />
    </div>
  );
}

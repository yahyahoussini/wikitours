import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { phoneKey } from '@/lib/crm/client-key';
import { LEAD_STATUSES } from '@/lib/admin/lead-statuses';

export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('fr-MA');
const dateFmt = (iso) => new Date(iso).toLocaleDateString('fr-FR');
const dateTimeFmt = (iso) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const refHost = (referrer) => {
  try {
    return new URL(referrer).hostname;
  } catch {
    return referrer;
  }
};

/**
 * Auto-derived client profile: every lead sharing the same phone key (last 9
 * digits) is the same client — no extra table. Shows all reservations with
 * dates/status, every recorded website visit (via the analytics visitor ids
 * linked to the leads), and the submitting IPs (recorded from migration 013).
 */
export default async function AdminClientProfilePage({ params }) {
  const { key } = await params;
  if (!/^\d{6,15}$/.test(key)) notFound();
  const sb = await supabaseServer();
  if (!sb) notFound();

  // Stored phones keep their typed formatting (spaces, +212 …), so suffix
  // matching happens in JS on the normalized key, not in SQL.
  const { data: allLeads } = await sb
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000);
  const leads = (allLeads ?? []).filter((l) => phoneKey(l.phone) === key);
  if (!leads.length) notFound();

  const latest = leads[0];
  const statusLabel = new Map(LEAD_STATUSES.map((s) => [s.value, s.label]));
  const roomLabels = { double: 'Double', triple: 'Triple', quad: 'Quadruple', quint: 'Quintuple' };
  const ips = [...new Set(leads.map((l) => l.ip).filter(Boolean))];
  const totalValue = leads.reduce((sum, l) => sum + (l.value_mad ?? 0), 0);

  // Website visits: all sessions of every visitor id this client's leads carry.
  const visitorIds = [...new Set(leads.map((l) => l.visitor_id).filter(Boolean))];
  let sessions = [];
  let firstSeen = null;
  if (visitorIds.length) {
    const [sess, vis] = await Promise.all([
      sb
        .from('sessions')
        .select('id, started_at, entry_path, referrer, utm_source, city, device')
        .in('visitor_id', visitorIds)
        .order('started_at', { ascending: false })
        .limit(100),
      sb.from('visitors').select('id, first_seen').in('id', visitorIds),
    ]);
    sessions = sess.data ?? [];
    const seenDates = (vis.data ?? []).map((v) => +new Date(v.first_seen));
    if (seenDates.length) firstSeen = new Date(Math.min(...seenDates));
  }

  const stats = [
    ['Réservations', String(leads.length)],
    ['Visites du site', visitorIds.length ? String(sessions.length) : '—'],
    ['Client depuis', dateFmt((firstSeen ?? new Date(leads[leads.length - 1].created_at)).toISOString())],
    ['Valeur totale', totalValue > 0 ? `${nf.format(totalValue)} MAD` : '—'],
    ['Adresse IP', ips.length ? ips.join(' · ') : '—'],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/crm" className="text-sm text-bm-black/50 hover:text-bm-black">
          ← CRM
        </Link>
        <h1 className="mt-1 text-xl font-bold">{latest.full_name}</h1>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-bm-black/60">
          <a href={`tel:${latest.phone}`} className="tabular-nums hover:text-wiki-blue">{latest.phone}</a>
          {latest.city ? <span>{latest.city}</span> : null}
          {latest.locale ? <span className="uppercase">{latest.locale}</span> : null}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-card border border-bm-black/10 bg-white p-4 shadow-hairline">
            <p className="text-xs font-semibold uppercase tracking-wide text-bm-black/45">{label}</p>
            <p className="mt-1 break-all text-sm font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-card border border-bm-black/10 bg-white shadow-hairline">
        <h2 className="border-b border-bm-black/5 px-4 py-3 text-sm font-bold">
          Réservations ({leads.length})
        </h2>
        <table className="w-full text-sm">
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-bm-black/5 last:border-0">
                <td className="px-4 py-2.5 text-bm-black/50">{dateTimeFmt(lead.created_at)}</td>
                <td className="max-w-60 truncate px-4 py-2.5">{lead.offer_title ?? 'Demande générale'}</td>
                <td className="px-4 py-2.5 text-bm-black/60">
                  {[roomLabels[lead.room_type], lead.tier_label].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-bm-black/5 px-2.5 py-0.5 text-xs font-semibold">
                    {statusLabel.get(lead.status) ?? lead.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-bm-black/60">
                  {lead.value_mad ? `${nf.format(lead.value_mad)} MAD` : ''}
                </td>
                <td className="px-4 py-2.5 text-end">
                  <Link href={`/admin/crm/${lead.id}`} className="text-xs font-semibold text-wiki-blue hover:underline">
                    Détail →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-card border border-bm-black/10 bg-white shadow-hairline">
        <h2 className="border-b border-bm-black/5 px-4 py-3 text-sm font-bold">
          Visites du site {sessions.length ? `(${sessions.length} dernières)` : ''}
        </h2>
        {sessions.length ? (
          <table className="w-full text-sm">
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-bm-black/5 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-bm-black/50">{dateTimeFmt(s.started_at)}</td>
                  <td className="max-w-60 truncate px-4 py-2">{s.entry_path ?? '—'}</td>
                  <td className="px-4 py-2 text-bm-black/60">
                    {s.utm_source ?? (s.referrer ? refHost(s.referrer) : 'direct')}
                  </td>
                  <td className="px-4 py-2 text-bm-black/60">{s.city ?? ''}</td>
                  <td className="px-4 py-2 text-bm-black/60">{s.device ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-4 text-sm text-bm-black/40">
            Aucune visite reliée — le lien se crée quand le client envoie une demande depuis son navigateur (cookie visiteur).
          </p>
        )}
      </section>
    </div>
  );
}

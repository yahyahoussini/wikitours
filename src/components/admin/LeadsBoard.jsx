'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateLeadStatus } from '@/app/admin/entity-actions';
import LeadRow, { LEAD_STATUSES } from '@/components/admin/LeadRow';

const priceFmt = new Intl.NumberFormat('fr-MA');

/**
 * Pipeline board (drag a card between status columns) with a list fallback.
 * The view + all filters live in the URL so exports share the exact filter.
 */
export default function LeadsBoard({ leads, view, filters, filterOptions, exportQuery }) {
  const router = useRouter();
  const [dragId, setDragId] = useState(null);
  const staleCutoffIso = new Date(Date.now() - 48 * 3600000).toISOString();

  async function dropOn(status) {
    if (!dragId) return;
    const lead = leads.find((l) => l.id === dragId);
    setDragId(null);
    if (!lead || lead.status === status) return;
    await updateLeadStatus({ id: dragId, status });
    router.refresh();
  }

  const filterInput =
    'rounded-ctrl border border-bm-black/15 bg-white px-2.5 py-1.5 text-sm shadow-hairline outline-none focus:border-wiki-blue';

  return (
    <div className="flex flex-col gap-4">
      {/* Filters (GET form → shareable URL, reused by exports) */}
      <form action="/admin/crm" method="get" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="view" value={view} />
        <input type="search" name="q" defaultValue={filters.q} placeholder="Nom, téléphone…" className={`${filterInput} w-48`} />
        <select name="status" defaultValue={filters.status} className={filterInput}>
          <option value="">Statut : tous</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select name="source" defaultValue={filters.source} className={filterInput}>
          <option value="">Source : toutes</option>
          {filterOptions.sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="city" defaultValue={filters.city} className={filterInput}>
          <option value="">Ville : toutes</option>
          {filterOptions.cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select name="offer" defaultValue={filters.offer} className={filterInput}>
          <option value="">Offre : toutes</option>
          {filterOptions.offers.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <label className="flex flex-col text-[10px] font-semibold uppercase text-bm-black/40">
          Du
          <input type="date" name="from" defaultValue={filters.from} className={filterInput} />
        </label>
        <label className="flex flex-col text-[10px] font-semibold uppercase text-bm-black/40">
          Au
          <input type="date" name="to" defaultValue={filters.to} className={filterInput} />
        </label>
        <button type="submit" className="rounded-ctrl bg-bm-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-bm-black-soft">
          Filtrer
        </button>

        <div className="ms-auto flex items-center gap-2">
          <Link
            href={`/admin/crm?${new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), view: view === 'board' ? 'list' : 'board' })}`}
            className="rounded-ctrl bg-bm-black/5 px-3 py-2 text-sm font-semibold transition hover:bg-bm-black/10"
          >
            {view === 'board' ? 'Vue liste' : 'Vue pipeline'}
          </Link>
          <a href={`/api/admin/export/leads?fmt=csv&${exportQuery}`} className="rounded-ctrl bg-bm-black/5 px-3 py-2 text-sm font-semibold transition hover:bg-bm-black/10">
            CSV
          </a>
          <a href={`/api/admin/export/leads?fmt=oci&${exportQuery}`} title="Google Ads — conversions hors ligne (gclid + téléphone haché)" className="rounded-ctrl bg-bm-black/5 px-3 py-2 text-sm font-semibold transition hover:bg-bm-black/10">
            Google Ads OCI
          </a>
          <a href={`/api/admin/export/leads?fmt=meta&${exportQuery}`} title="Meta — conversions hors ligne (téléphone haché)" className="rounded-ctrl bg-bm-black/5 px-3 py-2 text-sm font-semibold transition hover:bg-bm-black/10">
            Meta Offline
          </a>
        </div>
      </form>

      {view === 'board' ? (
        <div className="grid gap-3 overflow-x-auto lg:grid-cols-6">
          {LEAD_STATUSES.map((s) => {
            const column = leads.filter((l) => l.status === s.value);
            return (
              <div
                key={s.value}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(s.value)}
                className="min-h-40 rounded-card border border-bm-black/10 bg-bm-black/[0.03] p-2"
              >
                <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-bm-black/50">
                  {s.label} <span className="tabular-nums">({column.length})</span>
                </p>
                <div className="flex flex-col gap-2">
                  {column.map((lead) => {
                    const stale = lead.status === 'new' && lead.created_at < staleCutoffIso;
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDragId(lead.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => router.push(`/admin/crm/${lead.id}`)}
                        className={`cursor-grab rounded-ctrl border bg-white p-2.5 text-sm shadow-hairline transition hover:shadow-lift active:cursor-grabbing ${
                          stale ? 'border-red-300 bg-red-50' : 'border-bm-black/10'
                        } ${dragId === lead.id ? 'opacity-50' : ''}`}
                      >
                        <p className="font-semibold">{lead.full_name}</p>
                        <p className="truncate text-xs text-bm-black/50">
                          {[lead.city, lead.offer_title].filter(Boolean).join(' · ') || '—'}
                        </p>
                        <p className="mt-1 flex items-center justify-between text-xs text-bm-black/40">
                          <span>{new Date(lead.created_at).toLocaleDateString('fr-FR')}</span>
                          {lead.value_mad != null ? (
                            <span className="font-semibold text-bm-black">{priceFmt.format(lead.value_mad)} MAD</span>
                          ) : null}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : leads.length === 0 ? (
        <p className="text-sm text-bm-black/50">Aucun lead.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-bm-black/10 bg-white shadow-hairline">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bm-black/10 text-start text-xs uppercase tracking-wide text-bm-black/40">
                {['Nom', 'Téléphone', 'Ville', 'Offre', 'Date', 'Statut'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-start font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} staleCutoffIso={staleCutoffIso} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

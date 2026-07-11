'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { togglePublish, cycleOfferStatus, duplicateEntity } from '@/app/admin/entity-actions';

const STATUS_STYLE = {
  open: 'bg-green-100 text-green-800 border-green-300',
  few_left: 'bg-amber-100 text-amber-800 border-amber-300',
  full: 'bg-red-100 text-red-800 border-red-300',
};
const STATUS_LABEL = { open: 'Ouvert', few_left: 'Dernières places', full: 'Complet' };

const priceFmt = new Intl.NumberFormat('fr-MA');

function isPast(offer) {
  return offer.date_end && offer.date_end < new Date().toISOString().slice(0, 10);
}

/**
 * The daily screen: offers grouped by occasion. Inline status pill cycles
 * open → few_left → full; past-dated offers grey out (already excluded from
 * public queries by RLS); "Dupliquer → prochain départ" clears dates only.
 */
export default function OffersBoard({ groups }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const filteredGroups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        offers: group.offers.filter((o) => {
          if (filter === 'published' && !o.is_published) return false;
          if (filter === 'draft' && o.is_published) return false;
          if (filter === 'past' && !isPast(o)) return false;
          if (filter !== 'past' && needle === '' && isPast(o) && filter === 'all') return true;
          if (!needle) return true;
          return ['title_fr', 'title_ar', 'title_en', 'slug', 'airline'].some((k) =>
            String(o[k] ?? '').toLowerCase().includes(needle),
          );
        }),
      }))
      .filter((g) => g.offers.length > 0);
  }, [groups, q, filter]);

  async function run(id, fn) {
    setBusyId(id);
    const result = await fn();
    setBusyId(null);
    if (result?.ok && result.duplicated) {
      router.push(`/admin/offres/${result.row.id}`);
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une offre…"
          autoFocus
          className="w-64 rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue"
        />
        <div className="flex items-center gap-1 text-sm">
          {[
            ['all', 'Toutes'],
            ['published', 'Publiées'],
            ['draft', 'Brouillons'],
            ['past', 'Passées'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-ctrl px-3 py-1.5 transition ${
                filter === value
                  ? 'bg-wiki-blue font-semibold text-white'
                  : 'bg-bm-black/5 hover:bg-bm-black/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Link
          href="/admin/offres/new"
          className="ms-auto rounded-ctrl bg-wiki-blue px-4 py-2 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
        >
          + Nouvelle offre
        </Link>
      </div>

      {filteredGroups.length === 0 ? (
        <p className="text-sm text-bm-black/50">Aucune offre.</p>
      ) : (
        filteredGroups.map((group) => (
          <section key={group.id ?? 'none'}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-bm-black/50">
              {group.name ?? 'Sans occasion'}
            </h2>
            <div className="overflow-x-auto rounded-card border border-bm-black/10 bg-white shadow-hairline">
              <table className="w-full text-sm">
                <tbody>
                  {group.offers.map((offer) => {
                    const past = isPast(offer);
                    return (
                      <tr
                        key={offer.id}
                        className={`cursor-pointer border-b border-bm-black/5 transition last:border-0 hover:bg-wiki-blue/5 ${
                          past ? 'opacity-45' : ''
                        }`}
                        onClick={() => router.push(`/admin/offres/${offer.id}`)}
                      >
                        <td className="max-w-80 truncate px-4 py-3 font-medium">
                          {offer.title_fr ?? offer.slug}
                          {past ? (
                            <span className="ms-2 rounded-full bg-bm-black/10 px-2 py-0.5 text-[10px] font-bold uppercase">
                              Passée
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-bm-black/60">
                          {offer.date_start?.slice(0, 10) ?? '—'}
                          {offer.date_end ? ` → ${offer.date_end.slice(0, 10)}` : ''}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {offer.starting_price != null
                            ? `dès ${priceFmt.format(offer.starting_price)} MAD`
                            : '—'}
                          {offer.land_only ? (
                            <span className="ms-2 text-xs text-bm-black/40">sans vol</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="Cliquer pour changer le statut"
                            disabled={busyId === offer.id}
                            onClick={() => run(offer.id, () => cycleOfferStatus(offer.id))}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-80 ${STATUS_STYLE[offer.status]}`}
                          >
                            {STATUS_LABEL[offer.status]}
                          </button>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="Dupliquer en vidant les dates — à re-dater puis publier"
                            disabled={busyId === offer.id}
                            onClick={() =>
                              run(offer.id, async () => {
                                const r = await duplicateEntity('offres', offer.id, [
                                  'date_start',
                                  'date_end',
                                ]);
                                return { ...r, duplicated: true };
                              })
                            }
                            className="rounded-ctrl bg-bm-gold/20 px-3 py-1 text-xs font-semibold text-bm-black transition hover:bg-bm-gold/40"
                          >
                            Dupliquer → prochain départ
                          </button>
                        </td>
                        <td className="px-4 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={busyId === offer.id}
                            onClick={() =>
                              run(offer.id, () => togglePublish('offres', offer.id, !offer.is_published))
                            }
                            aria-pressed={!!offer.is_published}
                            className={`h-5 w-9 rounded-full transition ${
                              offer.is_published ? 'bg-green-600' : 'bg-bm-black/20'
                            }`}
                          >
                            <span
                              className={`block size-4 rounded-full bg-white shadow-hairline transition ${
                                offer.is_published ? 'ms-4' : 'ms-0.5'
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

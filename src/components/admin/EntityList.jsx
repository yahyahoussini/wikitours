'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { togglePublish } from '@/app/admin/entity-actions';

function cellValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (value === true) return 'Oui';
  if (value === false) return 'Non';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return String(value);
}

/**
 * Generic admin list: instant search, publish filter, inline publish toggle.
 * Row click opens the edit form.
 */
export default function EntityList({ entityKey, rows, columns, searchKeys, publishField, basePath }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all'); // all | published | draft
  const [busyId, setBusyId] = useState(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === 'published' && !row[publishField]) return false;
      if (filter === 'draft' && row[publishField]) return false;
      if (!needle) return true;
      return searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(needle));
    });
  }, [rows, q, filter, publishField, searchKeys]);

  async function onToggle(row) {
    setBusyId(row.id);
    await togglePublish(entityKey, row.id, !row[publishField]);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher…"
          autoFocus
          className="w-64 rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue"
        />
        <div className="flex items-center gap-1 text-sm">
          {[
            ['all', 'Tous'],
            ['published', 'Publiés'],
            ['draft', 'Brouillons'],
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
          href={`${basePath}/new`}
          className="ms-auto rounded-ctrl bg-wiki-blue px-4 py-2 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
        >
          + Nouveau
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-bm-black/50">Aucun résultat.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-bm-black/10 bg-white shadow-hairline">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-bm-black/10 text-start text-xs uppercase tracking-wide text-bm-black/40">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-2.5 text-start font-semibold">
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-end font-semibold">Publié</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-bm-black/5 transition last:border-0 hover:bg-wiki-blue/5"
                  onClick={() => router.push(`${basePath}/${row.id}`)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="max-w-72 truncate px-4 py-2.5">
                      {cellValue(row[col.key])}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => onToggle(row)}
                      aria-pressed={!!row[publishField]}
                      className={`h-5 w-9 rounded-full transition ${
                        row[publishField] ? 'bg-green-600' : 'bg-bm-black/20'
                      } ${busyId === row.id ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`block size-4 rounded-full bg-white shadow-hairline transition ${
                          row[publishField] ? 'ms-4' : 'ms-0.5'
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addKeywordCheck, deleteKeywordCheck } from '@/app/admin/entity-actions';

const ENGINES = [
  { value: 'google', label: 'Google' },
  { value: 'ai_overview', label: 'AI Overview' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'gemini', label: 'Gemini' },
];

const INPUT =
  'rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue';

/** Inline SVG trend: position over time — lower position = higher point. */
function TrendChart({ checks }) {
  const points = checks
    .filter((c) => c.position != null && c.checked_at)
    .sort((a, b) => (a.checked_at < b.checked_at ? -1 : 1));
  if (points.length < 2) return null;

  const width = 220;
  const height = 48;
  const maxPos = Math.max(...points.map((p) => p.position), 10);
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (width - 8) + 4;
    const y = 4 + ((p.position - 1) / (maxPos - 1 || 1)) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-12 w-56"
      role="img"
      aria-label={`Tendance : position ${points[0].position} → ${points[points.length - 1].position}`}
    >
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="#1398c9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map((c, i) => {
        const [x, y] = c.split(',');
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#1398c9" />;
      })}
    </svg>
  );
}

export default function KeywordPanel({ groups }) {
  const router = useRouter();
  const [form, setForm] = useState({ keyword: '', engine: 'google', position: '', cited: false, notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onAdd(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await addKeywordCheck({
      keyword: form.keyword,
      engine: form.engine,
      position: form.position === '' ? null : Number(form.position),
      cited: form.cited,
      notes: form.notes || null,
      checked_at: null,
    });
    setBusy(false);
    if (result.ok) {
      setForm((f) => ({ ...f, position: '', cited: false, notes: '' }));
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function onDelete(id) {
    if (!window.confirm('Supprimer ce relevé ?')) return;
    await deleteKeywordCheck(id);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onAdd} className="flex flex-wrap items-end gap-3 rounded-card border border-bm-black/10 bg-white p-4 shadow-hairline">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Mot-clé
          <input
            required
            value={form.keyword}
            onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
            className={`${INPUT} w-72`}
            list="known-keywords"
          />
          <datalist id="known-keywords">
            {groups.map((g) => (
              <option key={g.key} value={g.keyword} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Moteur
          <select
            value={form.engine}
            onChange={(e) => setForm((f) => ({ ...f, engine: e.target.value }))}
            className={INPUT}
          >
            {ENGINES.map((e2) => (
              <option key={e2.value} value={e2.value}>{e2.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Position
          <input
            type="number"
            min="1"
            value={form.position}
            onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            onWheel={(e) => e.currentTarget.blur()}
            className={`${INPUT} w-24`}
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={form.cited}
            onChange={(e) => setForm((f) => ({ ...f, cited: e.target.checked }))}
            className="size-4 accent-wiki-blue"
          />
          Cité (GEO/AEO)
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Notes
          <input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className={`${INPUT} w-56`}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-ctrl bg-wiki-blue px-4 py-2 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90 disabled:opacity-60"
        >
          Ajouter un relevé
        </button>
        {error ? <p className="w-full text-sm text-red-600">{error}</p> : null}
      </form>

      {groups.length === 0 ? (
        <p className="text-sm text-bm-black/50">Aucun mot-clé suivi.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => {
            const latest = group.checks.find((c) => c.position != null);
            return (
              <section key={group.key} className="rounded-card border border-bm-black/10 bg-white p-4 shadow-hairline">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold" dir="auto">{group.keyword}</h2>
                    <p className="text-xs text-bm-black/40">
                      {ENGINES.find((e) => e.value === group.engine)?.label ?? group.engine}
                      {latest ? ` · position ${latest.position}` : ''}
                    </p>
                  </div>
                  <TrendChart checks={group.checks} />
                </div>
                <ul className="mt-3 space-y-1 text-xs text-bm-black/60">
                  {group.checks.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <span className="tabular-nums">
                        {c.checked_at ? new Date(c.checked_at).toLocaleDateString('fr-FR') : '—'}
                      </span>
                      <span>{c.position != null ? `#${c.position}` : 'non classé'}</span>
                      {c.cited ? <span className="rounded-full bg-green-100 px-1.5 text-[10px] font-bold text-green-700">cité</span> : null}
                      <span className="truncate">{c.notes}</span>
                      <button
                        type="button"
                        onClick={() => onDelete(c.id)}
                        className="ms-auto text-red-500 hover:text-red-700"
                        aria-label="Supprimer ce relevé"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

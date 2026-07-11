'use client';

import { useState } from 'react';
import { updateMediaAlt } from '@/app/admin/actions';

const FIELDS = [
  { key: 'alt_fr', label: 'Alt FR', dir: 'ltr' },
  { key: 'alt_ar', label: 'Alt AR', dir: 'rtl' },
  { key: 'alt_en', label: 'Alt EN', dir: 'ltr' },
];

/** Alt text ×3 for one media row (saved via server action). */
export default function AltEditor({ media }) {
  const [values, setValues] = useState({
    alt_fr: media.alt_fr ?? '',
    alt_ar: media.alt_ar ?? '',
    alt_en: media.alt_en ?? '',
  });
  const [state, setState] = useState('idle'); // idle | saving | saved | error

  async function save() {
    setState('saving');
    const result = await updateMediaAlt({ id: media.id, ...values });
    setState(result.ok ? 'saved' : 'error');
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <input
            key={f.key}
            dir={f.dir}
            placeholder={f.label}
            value={values[f.key]}
            onChange={(e) => {
              setValues((v) => ({ ...v, [f.key]: e.target.value }));
              setState('idle');
            }}
            className="rounded-ctrl border border-bm-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-wiki-blue"
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={state === 'saving'}
          className="rounded-ctrl bg-bm-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-bm-black-soft disabled:opacity-60"
        >
          {state === 'saving' ? 'Enregistrement…' : 'Enregistrer les alt'}
        </button>
        {state === 'saved' ? <span className="text-xs text-green-700">Enregistré ✓</span> : null}
        {state === 'error' ? (
          <span className="text-xs text-red-600">Une erreur est survenue.</span>
        ) : null}
      </div>
    </div>
  );
}

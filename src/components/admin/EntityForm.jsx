'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveEntity, duplicateEntity, deleteEntity } from '@/app/admin/entity-actions';
import { publicMediaUrl } from '@/lib/media';
import GalleryManager from '@/components/admin/GalleryManager';

const LANGS = [
  { code: 'fr', label: 'FR', dir: 'ltr' },
  { code: 'ar', label: 'AR', dir: 'rtl' },
  { code: 'en', label: 'EN', dir: 'ltr' },
];

const INPUT_CLASSES =
  'w-full rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue';

function initialValues(fields, publishField, hasSeo, record) {
  const values = {};
  for (const field of fields) {
    if (field.type.endsWith('3')) {
      for (const { code } of LANGS) {
        values[`${field.name}_${code}`] = record?.[`${field.name}_${code}`] ?? '';
      }
    } else if (field.type === 'bool') {
      values[field.name] = record?.[field.name] ?? false;
    } else {
      values[field.name] = record?.[field.name] ?? '';
    }
  }
  values[publishField] = record?.[publishField] ?? false;
  if (hasSeo) {
    for (const { code } of LANGS) {
      values[`seo_title_${code}`] = record?.[`seo_title_${code}`] ?? '';
      values[`seo_description_${code}`] = record?.[`seo_description_${code}`] ?? '';
    }
  }
  return values;
}

/**
 * Generic admin form: FR/AR/EN tabs, local autosave-draft with indicator,
 * sticky save bar (Ctrl/Cmd+S), unsaved-changes guard, Duplicate, SEO panel
 * with live Google snippet preview, gallery, double-confirmed delete.
 */
export default function EntityForm({
  entityKey,
  config,
  record,
  relOptions = {},
  galleryItems = null,
  basePath,
  publicUrlBase = null,
  extraDuplicate = null, // { label, clearFields } — e.g. offers' next-departure
}) {
  const router = useRouter();
  const { fields, publishField, hasSeo, hasGallery, duplicateDisabled, galleryEntityType } = config;

  const initial = useMemo(
    () => initialValues(fields, publishField, hasSeo, record),
    [fields, publishField, hasSeo, record],
  );
  const [values, setValues] = useState(initial);
  const [lang, setLang] = useState('fr');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [draftAt, setDraftAt] = useState(null);
  const [restorable, setRestorable] = useState(null);
  const [error, setError] = useState(null);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initial), [values, initial]);
  const draftKey = `wt-draft:${entityKey}:${record?.id ?? 'new'}`;

  // Restore prompt for an abandoned local draft.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (JSON.stringify(draft.values) !== JSON.stringify(initial)) {
        setRestorable(draft);
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {
      // corrupted draft — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  // Autosave the draft locally (indicator in the sticky bar).
  const draftTimer = useRef(null);
  useEffect(() => {
    if (!dirty) return undefined;
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ values, at: Date.now() }));
        setDraftAt(new Date());
      } catch {
        // storage full — non-fatal
      }
    }, 800);
    return () => clearTimeout(draftTimer.current);
  }, [values, dirty, draftKey]);

  // Unsaved-changes guard.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const set = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setError(null);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    const result = await saveEntity(entityKey, record?.id ?? null, values);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    localStorage.removeItem(draftKey);
    setDraftAt(null);
    setSavedAt(new Date());
    if (!record?.id) {
      router.replace(`${basePath}/${result.row.id}`);
    }
    router.refresh();
  }, [entityKey, record, values, draftKey, basePath, router]);

  // Ctrl/Cmd+S saves — keyboard-friendly.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving) save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, saving]);

  async function duplicate(clearFields = []) {
    const result = await duplicateEntity(entityKey, record.id, clearFields);
    if (result.ok) {
      router.push(`${basePath}/${result.row.id}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function destroy() {
    // Danger actions double-confirm.
    if (!window.confirm('Supprimer cet élément ?')) return;
    if (!window.confirm('Confirmation définitive — cette action est irréversible. Continuer ?')) return;
    const result = await deleteEntity(entityKey, record.id);
    if (result.ok) {
      localStorage.removeItem(draftKey);
      router.push(basePath);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  const triFields = fields.filter((f) => f.type.endsWith('3'));
  const plainFields = fields.filter((f) => !f.type.endsWith('3'));
  const currentLang = LANGS.find((l) => l.code === lang);

  const snippetTitle =
    values[`seo_title_${lang}`] ||
    values[`title_${lang}`] ||
    values[`name_${lang}`] ||
    values.name ||
    '';
  const snippetUrl = publicUrlBase
    ? `${publicUrlBase.replace('{locale}', lang)}${values.slug ? `/${values.slug}` : ''}`
    : null;

  return (
    <div className="flex flex-col gap-6 pb-24">
      {restorable ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-bm-gold bg-bm-gold/10 px-4 py-3 text-sm">
          <span>
            Brouillon local non enregistré du{' '}
            {new Date(restorable.at).toLocaleString('fr-FR')} trouvé.
          </span>
          <button
            type="button"
            className="font-semibold text-wiki-blue hover:underline"
            onClick={() => {
              setValues((v) => ({ ...v, ...restorable.values }));
              setRestorable(null);
            }}
          >
            Restaurer
          </button>
          <button
            type="button"
            className="text-bm-black/50 hover:text-bm-black"
            onClick={() => {
              localStorage.removeItem(draftKey);
              setRestorable(null);
            }}
          >
            Ignorer
          </button>
        </div>
      ) : null}

      {plainFields.length > 0 ? (
        <section className="grid gap-4 rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline sm:grid-cols-2">
          {plainFields.map((field) => (
            <Field
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(v) => set(field.name, v)}
              relOptions={relOptions[field.name]}
            />
          ))}
        </section>
      ) : null}

      {triFields.length > 0 ? (
        <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
          <div className="mb-4 flex items-center gap-1" role="tablist" aria-label="Langue">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                role="tab"
                aria-selected={lang === l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-ctrl px-4 py-1.5 text-sm font-semibold transition ${
                  lang === l.code ? 'bg-bm-black text-white' : 'bg-bm-black/5 hover:bg-bm-black/10'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4" dir={currentLang.dir}>
            {triFields.map((field) => {
              const name = `${field.name}_${lang}`;
              return (
                <label key={name} className="flex flex-col gap-1 text-sm font-medium">
                  {field.label} ({lang.toUpperCase()})
                  {field.type === 'text3' ? (
                    <input
                      value={values[name] ?? ''}
                      onChange={(e) => set(name, e.target.value)}
                      className={INPUT_CLASSES}
                    />
                  ) : (
                    <textarea
                      value={values[name] ?? ''}
                      onChange={(e) => set(name, e.target.value)}
                      rows={field.type === 'md3' ? 12 : 4}
                      className={`${INPUT_CLASSES} ${field.type === 'md3' ? 'font-mono text-xs' : ''}`}
                    />
                  )}
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      {hasSeo ? (
        <details className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
          <summary className="cursor-pointer text-sm font-bold">
            SEO — titre & description ({lang.toUpperCase()})
          </summary>
          <div className="mt-4 grid gap-4" dir={currentLang.dir}>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Titre SEO
              <input
                value={values[`seo_title_${lang}`] ?? ''}
                onChange={(e) => set(`seo_title_${lang}`, e.target.value)}
                className={INPUT_CLASSES}
              />
              <span className="text-xs font-normal text-bm-black/40">
                {(values[`seo_title_${lang}`] ?? '').length}/60
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Description SEO
              <textarea
                value={values[`seo_description_${lang}`] ?? ''}
                onChange={(e) => set(`seo_description_${lang}`, e.target.value)}
                rows={2}
                className={INPUT_CLASSES}
              />
              <span className="text-xs font-normal text-bm-black/40">
                {(values[`seo_description_${lang}`] ?? '').length}/160
              </span>
            </label>
            {/* Live Google snippet preview */}
            <div className="rounded-ctrl border border-bm-black/10 bg-wiki-white p-4" dir={currentLang.dir}>
              {snippetUrl ? <p className="text-xs text-green-800">{snippetUrl}</p> : null}
              <p className="text-lg leading-snug text-[#1a0dab]">
                {(snippetTitle || 'Titre de la page').slice(0, 60)}
                {snippetTitle.length > 60 ? '…' : ''}
              </p>
              <p className="text-sm text-bm-black/60">
                {(values[`seo_description_${lang}`] || 'Description affichée dans les résultats de recherche.').slice(0, 160)}
              </p>
            </div>
          </div>
        </details>
      ) : null}

      {hasGallery && record?.id && galleryItems !== null ? (
        <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
          <h2 className="mb-4 text-sm font-bold">Galerie</h2>
          <GalleryManager
            entityType={galleryEntityType}
            entityId={record.id}
            initialItems={galleryItems}
          />
        </section>
      ) : hasGallery && !record?.id ? (
        <p className="text-sm text-bm-black/40">
          Enregistrez d’abord pour ajouter des médias.
        </p>
      ) : null}

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-bm-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-ctrl bg-wiki-blue px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90 disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer (Ctrl+S)'}
          </button>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={!!values[publishField]}
              onChange={(e) => set(publishField, e.target.checked)}
              className="size-4 accent-wiki-blue"
            />
            Publié
          </label>
          <span className="text-xs text-bm-black/40">
            {dirty
              ? draftAt
                ? `Brouillon local · ${draftAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — modifications non enregistrées`
                : 'Modifications non enregistrées'
              : savedAt
                ? `Enregistré ✓ ${savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Aucune modification'}
          </span>
          <div className="ms-auto flex items-center gap-3">
            {record?.id && extraDuplicate ? (
              <button
                type="button"
                onClick={() => duplicate(extraDuplicate.clearFields)}
                className="rounded-ctrl bg-bm-gold px-4 py-2.5 text-sm font-semibold text-bm-black transition hover:bg-bm-gold-light"
              >
                {extraDuplicate.label}
              </button>
            ) : null}
            {record?.id && !duplicateDisabled ? (
              <button
                type="button"
                onClick={() => duplicate([])}
                className="rounded-ctrl bg-bm-black/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-bm-black/10"
              >
                Dupliquer
              </button>
            ) : null}
            {record?.id ? (
              <button
                type="button"
                onClick={destroy}
                className="text-sm font-medium text-red-600 transition hover:text-red-700"
              >
                Supprimer
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Image field storing a storage path: uploads via the validated admin route. */
function MediaField({ field, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const src = publicMediaUrl(value);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || !json.media?.path) {
        setUploadError(json.error ?? 'Une erreur est survenue.');
      } else {
        onChange(json.media.path);
      }
    } catch {
      setUploadError('Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      {field.label}
      <div className="flex items-center gap-3">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- small admin preview
          <img src={src} alt="" className="size-12 rounded-ctrl border border-bm-black/10 bg-white object-contain p-1" />
        ) : null}
        <label className="cursor-pointer rounded-ctrl bg-bm-black/5 px-4 py-2 text-sm font-semibold transition hover:bg-bm-black/10">
          {busy ? 'Envoi…' : value ? 'Remplacer' : 'Choisir une image'}
          <input type="file" accept={field.accept ?? 'image/*'} onChange={onFile} disabled={busy} className="hidden" />
        </label>
        {value ? (
          <button type="button" onClick={() => onChange('')} className="text-sm font-medium text-red-600 hover:text-red-700">
            Retirer
          </button>
        ) : null}
      </div>
      {uploadError ? <span className="text-xs font-normal text-red-600">{uploadError}</span> : null}
    </div>
  );
}

function Field({ field, value, onChange, relOptions }) {
  if (field.type === 'media') {
    return <MediaField field={field} value={value} onChange={onChange} />;
  }
  if (field.type === 'bool') {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-wiki-blue"
        />
        {field.label}
      </label>
    );
  }

  let input;
  if (field.type === 'select' || field.type === 'rel') {
    const options = field.type === 'rel' ? (relOptions ?? []) : field.options;
    input = (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASSES}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (field.type === 'textarea') {
    input = (
      <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={3} className={INPUT_CLASSES} />
    );
  } else {
    const type =
      field.type === 'number'
        ? 'number'
        : field.type === 'date'
          ? 'date'
          : field.type === 'datetime'
            ? 'datetime-local'
            : 'text';
    const displayed =
      field.type === 'datetime' && value ? String(value).slice(0, 16) : (value ?? '');
    input = (
      <input
        type={type}
        value={displayed}
        required={field.required}
        onChange={(e) =>
          onChange(field.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)
        }
        className={INPUT_CLASSES}
      />
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {field.label}
      {field.required ? <span className="sr-only">(requis)</span> : null}
      {input}
    </label>
  );
}

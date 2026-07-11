'use client';

import { useEffect, useState } from 'react';
import { publicMediaUrl } from '@/lib/media';
import { attachMedia, detachMedia, reorderGallery } from '@/app/admin/actions';
import MediaUploader from '@/components/admin/MediaUploader';

/**
 * Gallery editor for ANY record (offers, hotels, destinations, articles,
 * landing pages, team, site heroes). Attach unlimited media from the library
 * or by direct upload; drag-drop to reorder (persists sort_order); the first
 * item is the cover, used as hero/card image on the public site.
 */
export default function GalleryManager({ entityType, entityId, initialItems }) {
  const [items, setItems] = useState(initialItems);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState(null);

  const attachedMediaIds = new Set(items.map((it) => it.media_id));

  async function persistOrder(next) {
    setItems(next);
    const result = await reorderGallery({
      entityType,
      entityId,
      orderedIds: next.map((it) => it.id),
    });
    if (!result.ok) setError(result.error);
  }

  function onDrop(target) {
    if (dragIndex === null || target === dragIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    persistOrder(next);
  }

  async function attach(media) {
    if (attachedMediaIds.has(media.id)) return;
    setError(null);
    const result = await attachMedia({ entityType, entityId, mediaId: media.id });
    if (result.ok) {
      setItems((list) => [...list, result.item]);
    } else {
      setError(result.error);
    }
  }

  async function detach(item) {
    setError(null);
    const result = await detachMedia({ galleryId: item.id, entityType, entityId });
    if (result.ok) {
      setItems((list) => list.filter((it) => it.id !== item.id));
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {items.length === 0 ? (
        <p className="text-sm text-bm-black/50">
          Aucun média attaché — la galerie est masquée sur le site.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, index) => {
            const url = publicMediaUrl(item.media?.path);
            return (
              <li
                key={item.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(index);
                }}
                onDrop={() => onDrop(index)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className={`group relative cursor-grab overflow-hidden rounded-card border bg-white shadow-hairline transition active:cursor-grabbing ${
                  overIndex === index && dragIndex !== null && dragIndex !== index
                    ? 'border-wiki-blue'
                    : 'border-bm-black/10'
                } ${dragIndex === index ? 'opacity-50' : ''}`}
              >
                <div className="relative aspect-[4/3] bg-bm-black/5">
                  {item.media?.kind === 'image' && url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin thumbs
                    <img src={url} alt={item.media?.alt_fr ?? ''} className="size-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl text-bm-black/30">
                      {item.media?.kind === 'video' ? '▶' : 'PDF'}
                    </div>
                  )}
                </div>
                {index === 0 ? (
                  <span className="absolute start-2 top-2 rounded-full bg-bm-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bm-black">
                    Couverture
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => detach(item)}
                  className="absolute end-2 top-2 rounded-full bg-bm-black/70 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
                >
                  Retirer
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 1 ? (
        <p className="text-xs text-bm-black/40">
          Glissez-déposez pour réordonner — le 1ᵉʳ élément est la couverture.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded-ctrl bg-wiki-blue px-4 py-2 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
          >
            Ajouter depuis la bibliothèque
          </button>
          <span className="text-xs text-bm-black/40">ou téléversez directement :</span>
        </div>
        <MediaUploader compact showAltFields={false} onUploaded={attach} />
      </div>

      {pickerOpen ? (
        <LibraryPicker
          attachedMediaIds={attachedMediaIds}
          onPick={attach}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}

function LibraryPicker({ attachedMediaIds, onPick, onClose }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (kind) params.set('kind', kind);
        const res = await fetch(`/api/admin/media?${params}`, { signal: controller.signal });
        const body = await res.json();
        setMedia(body.media ?? []);
      } catch {
        // aborted or network error — keep the previous list
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, kind]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bm-black/50 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-panel bg-white p-6 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Bibliothèque</h2>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher…"
            className="ms-auto w-56 rounded-ctrl border border-bm-black/15 px-3 py-1.5 text-sm outline-none focus:border-wiki-blue"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-ctrl border border-bm-black/15 px-2 py-1.5 text-sm"
          >
            <option value="">Tous</option>
            <option value="image">Images</option>
            <option value="video">Vidéos</option>
            <option value="document">Documents</option>
          </select>
          <button type="button" onClick={onClose} className="text-sm text-bm-black/50 hover:text-bm-black">
            Fermer ✕
          </button>
        </div>
        <div className="min-h-40 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-bm-black/50">Chargement…</p>
          ) : media.length === 0 ? (
            <p className="text-sm text-bm-black/50">Aucun média.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {media.map((m) => {
                const url = publicMediaUrl(m.path);
                const attached = attachedMediaIds.has(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      disabled={attached}
                      onClick={() => onPick(m)}
                      className={`relative block w-full overflow-hidden rounded-ctrl border transition ${
                        attached
                          ? 'cursor-not-allowed border-bm-black/5 opacity-40'
                          : 'border-bm-black/10 hover:border-wiki-blue'
                      }`}
                    >
                      <div className="aspect-[4/3] bg-bm-black/5">
                        {m.kind === 'image' && url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- picker thumbs
                          <img src={url} alt={m.alt_fr ?? ''} className="size-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xl text-bm-black/30">
                            {m.kind === 'video' ? '▶' : 'PDF'}
                          </div>
                        )}
                      </div>
                      {attached ? (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                          Déjà attaché
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

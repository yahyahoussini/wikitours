'use client';

import { useRef, useState } from 'react';
import { MEDIA_ACCEPT, publicMediaUrl } from '@/lib/media';
import AltEditor from '@/components/admin/AltEditor';

let uploadSeq = 0;

/** Uploads one file via XHR (fetch has no upload progress). */
function uploadFile(file, onProgress) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.media) {
          resolve({ ok: true, media: body.media });
        } else {
          resolve({ ok: false, error: body.error ?? 'Une erreur est survenue.' });
        }
      } catch {
        resolve({ ok: false, error: 'Une erreur est survenue.' });
      }
    };
    xhr.onerror = () => resolve({ ok: false, error: 'Erreur réseau.' });
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

/**
 * Drag-drop multi-file uploader with per-file progress. Each successful
 * upload yields a `media` row; `onUploaded(media)` lets a parent (e.g. the
 * GalleryManager) attach it immediately. When `showAltFields` is set, alt
 * text ×3 can be edited inline right after upload.
 */
export default function MediaUploader({ onUploaded, showAltFields = true, compact = false }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState([]);

  function patchItem(id, patch) {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList ?? []);
    for (const file of files) {
      const id = `u${++uploadSeq}`;
      setItems((list) => [...list, { id, name: file.name, progress: 0, status: 'uploading' }]);
      // Sequential uploads keep progress readable and the server unhammered.
      const result = await uploadFile(file, (p) => patchItem(id, { progress: p }));
      if (result.ok) {
        patchItem(id, { status: 'done', progress: 100, media: result.media });
        onUploaded?.(result.media);
      } else {
        patchItem(id, { status: 'error', error: result.error });
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed transition ${
          compact ? 'px-4 py-5' : 'px-6 py-10'
        } ${dragOver ? 'border-wiki-blue bg-wiki-blue/5' : 'border-bm-black/15 bg-white'}`}
      >
        <p className="text-sm font-semibold">
          Glissez-déposez vos fichiers ici, ou cliquez pour choisir
        </p>
        <p className="text-xs text-bm-black/50">
          Images ≤ 4 Mo · Vidéos MP4 ≤ 15 Mo · PDF ≤ 10 Mo
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={MEDIA_ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="rounded-ctrl border border-bm-black/10 bg-white p-3 shadow-hairline"
            >
              <div className="flex items-center gap-3">
                {it.media?.kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumb, freshly uploaded
                  <img
                    src={publicMediaUrl(it.media.path)}
                    alt=""
                    className="size-10 rounded-ctrl object-cover"
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate text-sm">{it.name}</span>
                {it.status === 'error' ? (
                  <span className="text-xs text-red-600">{it.error}</span>
                ) : (
                  <span className="text-xs tabular-nums text-bm-black/50">{it.progress}%</span>
                )}
              </div>
              {it.status === 'uploading' ? (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-bm-black/10">
                  <div
                    className="h-full bg-wiki-blue transition-[width] duration-200"
                    style={{ width: `${it.progress}%` }}
                  />
                </div>
              ) : null}
              {it.status === 'done' && showAltFields ? (
                <div className="mt-3">
                  <AltEditor media={it.media} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

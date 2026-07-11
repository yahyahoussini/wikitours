'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteMedia } from '@/app/admin/actions';

/** Delete with server-side usage check; shows where the media is used. */
export default function DeleteMediaButton({ mediaId }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function onDelete() {
    if (!window.confirm('Supprimer ce média définitivement ?')) return;
    setPending(true);
    setError(null);
    const result = await deleteMedia(mediaId);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="text-xs font-medium text-red-600 transition hover:text-red-700 disabled:opacity-60"
      >
        {pending ? 'Suppression…' : 'Supprimer'}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

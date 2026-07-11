import Image from 'next/image';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { publicMediaUrl } from '@/lib/media';
import MediaUploader from '@/components/admin/MediaUploader';
import AltEditor from '@/components/admin/AltEditor';
import DeleteMediaButton from '@/components/admin/DeleteMediaButton';

export const dynamic = 'force-dynamic';

const KINDS = [
  { value: '', label: 'Tous' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Vidéos' },
  { value: 'document', label: 'Documents' },
];

async function fetchMedia({ q, kind }) {
  const admin = supabaseAdmin();
  if (!admin) return [];
  let query = admin
    .from('media')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(120);
  if (kind) query = query.eq('kind', kind);
  if (q) {
    const like = `%${q.replaceAll('%', '')}%`;
    query = query.or(
      `path.ilike.${like},alt_fr.ilike.${like},alt_ar.ilike.${like},alt_en.ilike.${like}`,
    );
  }
  const { data } = await query;
  return data ?? [];
}

export default async function AdminMediaPage({ searchParams }) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const kind = ['image', 'video', 'document'].includes(params.kind) ? params.kind : '';
  const media = await fetchMedia({ q, kind });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-xl font-bold">Bibliothèque de médias</h1>
        <div className="mt-4">
          <MediaUploader />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <form className="flex flex-wrap items-center gap-3" action="/admin/media" method="get">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher (chemin, alt…)"
            className="w-64 rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue"
          />
          <div className="flex items-center gap-1">
            {KINDS.map((k) => (
              <Link
                key={k.value}
                href={{ pathname: '/admin/media', query: { ...(q ? { q } : {}), ...(k.value ? { kind: k.value } : {}) } }}
                className={`rounded-ctrl px-3 py-1.5 text-sm transition ${
                  kind === k.value
                    ? 'bg-wiki-blue font-semibold text-white'
                    : 'bg-bm-black/5 hover:bg-bm-black/10'
                }`}
              >
                {k.label}
              </Link>
            ))}
          </div>
          <button
            type="submit"
            className="rounded-ctrl bg-bm-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-bm-black-soft"
          >
            Rechercher
          </button>
        </form>

        {media.length === 0 ? (
          <p className="text-sm text-bm-black/50">Aucun média.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m) => {
              const url = publicMediaUrl(m.path);
              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-3 rounded-card border border-bm-black/10 bg-white p-3 shadow-hairline"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-ctrl bg-bm-black/5">
                    {m.kind === 'image' && url ? (
                      <Image
                        src={url}
                        alt={m.alt_fr ?? ''}
                        fill
                        sizes="(min-width: 1024px) 30vw, 50vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl text-bm-black/30">
                        {m.kind === 'video' ? '▶' : 'PDF'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-bm-black/50">
                    <span className="truncate" title={m.path}>
                      {m.path.split('/').pop()}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {m.width && m.height ? `${m.width}×${m.height} · ` : ''}
                      {m.size_kb} Ko
                    </span>
                  </div>
                  <AltEditor media={m} />
                  <DeleteMediaButton mediaId={m.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

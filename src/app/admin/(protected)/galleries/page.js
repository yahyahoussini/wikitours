import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { GALLERY_ENTITIES, SETTINGS_HERO_ENTITY_ID, SETTINGS_OFFICE_ENTITY_ID } from '@/lib/entities';

export const dynamic = 'force-dynamic';

/**
 * Pick a record, manage its gallery. The same GalleryManager component will
 * be embedded in each full edit form when those arrive; this page guarantees
 * every record's gallery is editable from day one.
 */
export default async function AdminGalleriesPage() {
  const admin = supabaseAdmin();

  const groups = [];
  if (admin) {
    for (const [type, entity] of Object.entries(GALLERY_ENTITIES)) {
      if (!entity.table) continue;
      const { data } = await admin
        .from(entity.table)
        .select(`id, ${entity.labelField}`)
        .order('created_at', { ascending: false })
        .limit(100);
      groups.push({
        type,
        label: entity.adminLabel,
        rows: (data ?? []).map((r) => ({ id: r.id, label: r[entity.labelField] ?? r.id })),
      });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-bold">Galeries</h1>

      {[
        {
          type: 'settings_hero',
          id: SETTINGS_HERO_ENTITY_ID,
          title: 'Héros du site',
          hint: "Images/vidéos du carrousel d'accueil.",
        },
        {
          type: 'settings_office',
          id: SETTINGS_OFFICE_ENTITY_ID,
          title: "Photos de l'agence",
          hint: 'Galerie du bureau de Casablanca (page Agence Omra).',
        },
      ].map((virtual) => (
        <section key={virtual.type} className="rounded-card border border-bm-black/10 bg-white p-4 shadow-hairline">
          <h2 className="font-semibold">{virtual.title}</h2>
          <p className="mt-1 text-sm text-bm-black/60">{virtual.hint}</p>
          <Link
            href={`/admin/galleries/${virtual.type}/${virtual.id}`}
            className="mt-2 inline-block text-sm font-semibold text-wiki-blue hover:underline"
          >
            Gérer la galerie →
          </Link>
        </section>
      ))}

      {groups.map((group) => (
        <section key={group.type}>
          <h2 className="font-semibold">{group.label}</h2>
          {group.rows.length === 0 ? (
            <p className="mt-1 text-sm text-bm-black/40">Aucun enregistrement.</p>
          ) : (
            <ul className="mt-2 divide-y divide-bm-black/5 rounded-card border border-bm-black/10 bg-white shadow-hairline">
              {group.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/galleries/${group.type}/${row.id}`}
                    className="flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-wiki-blue/5"
                  >
                    <span className="truncate">{row.label}</span>
                    <span className="text-wiki-blue">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

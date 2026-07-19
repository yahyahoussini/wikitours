import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ENTITY_TYPES, GALLERY_ENTITIES } from '@/lib/entities';
import GalleryManager from '@/components/admin/GalleryManager';

export const dynamic = 'force-dynamic';

export default async function AdminGalleryEditPage({ params }) {
  const { entityType, id } = await params;
  if (!ENTITY_TYPES.includes(entityType)) notFound();
  // guid, not uuid: the virtual galleries (settings_hero/office/team) use
  // sentinel ids (…0001/0002/0003) whose version bits fail Zod 4's strict
  // RFC uuid check.
  const parsedId = z.guid().safeParse(id);
  if (!parsedId.success) notFound();

  const admin = supabaseAdmin();
  if (!admin) notFound();

  const entity = GALLERY_ENTITIES[entityType];
  let label = entity.adminLabel;
  if (entity.table) {
    const { data: row } = await admin
      .from(entity.table)
      .select(`id, ${entity.labelField}`)
      .eq('id', id)
      .maybeSingle();
    if (!row) notFound();
    label = row[entity.labelField] ?? label;
  }

  const { data: items } = await admin
    .from('galleries')
    .select('*, media:media_id (*)')
    .eq('entity_type', entityType)
    .eq('entity_id', id)
    .order('sort_order', { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/galleries" className="text-sm text-bm-black/50 hover:text-bm-black">
          ← Galeries
        </Link>
        <h1 className="mt-1 text-xl font-bold">
          {entity.adminLabel} · {label}
        </h1>
      </div>
      <GalleryManager entityType={entityType} entityId={id} initialItems={items ?? []} />
    </div>
  );
}

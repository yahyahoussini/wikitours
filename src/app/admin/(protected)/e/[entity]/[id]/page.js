import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ADMIN_ENTITIES } from '@/lib/admin/registry';
import {
  fetchEntityRecord,
  fetchRelOptions,
  fetchGalleryItems,
  clientConfig,
  publicUrlBase,
} from '@/lib/admin/server';
import EntityForm from '@/components/admin/EntityForm';

export const dynamic = 'force-dynamic';

export default async function EntityEditPage({ params }) {
  const { entity, id } = await params;
  const config = ADMIN_ENTITIES[entity];
  if (!config) notFound();

  const isNew = id === 'new';
  const record = isNew ? null : await fetchEntityRecord(entity, id);
  if (!isNew && !record) notFound();

  const relOptions = await fetchRelOptions(entity);
  const galleryItems =
    config.hasGallery && record ? await fetchGalleryItems(config.table, record.id) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href={`/admin/e/${entity}`} className="text-sm text-bm-black/50 hover:text-bm-black">
          ← {config.title}
        </Link>
        <h1 className="mt-1 text-xl font-bold">
          {isNew ? `${config.title} — nouveau` : (record[config.labelField] ?? config.title)}
        </h1>
      </div>
      <EntityForm
        entityKey={entity}
        config={clientConfig(entity)}
        record={record}
        relOptions={relOptions}
        galleryItems={galleryItems}
        basePath={`/admin/e/${entity}`}
        publicUrlBase={publicUrlBase(entity)}
      />
    </div>
  );
}

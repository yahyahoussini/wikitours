import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  fetchEntityRecord,
  fetchRelOptions,
  fetchGalleryItems,
  clientConfig,
  publicUrlBase,
} from '@/lib/admin/server';
import EntityForm from '@/components/admin/EntityForm';

export const dynamic = 'force-dynamic';

export default async function AdminOfferEditPage({ params }) {
  const { id } = await params;
  const isNew = id === 'new';
  const record = isNew ? null : await fetchEntityRecord('offres', id);
  if (!isNew && !record) notFound();

  const relOptions = await fetchRelOptions('offres');
  const galleryItems = record ? await fetchGalleryItems('offers', record.id) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/offres" className="text-sm text-bm-black/50 hover:text-bm-black">
          ← Offres
        </Link>
        <h1 className="mt-1 text-xl font-bold">
          {isNew ? 'Nouvelle offre' : (record.title_fr ?? record.slug)}
        </h1>
        <p className="mt-1 text-xs text-bm-black/40">
          Le prix « à partir de » est calculé automatiquement (minimum des prix par chambre).
        </p>
      </div>
      <EntityForm
        entityKey="offres"
        config={clientConfig('offres')}
        record={record}
        relOptions={relOptions}
        galleryItems={galleryItems}
        basePath="/admin/offres"
        publicUrlBase={publicUrlBase('offres')}
        extraDuplicate={{
          label: 'Dupliquer → prochain départ',
          clearFields: ['date_start', 'date_end'],
        }}
      />
    </div>
  );
}

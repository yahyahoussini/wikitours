import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  fetchEntityRecord,
  fetchRelOptions,
  fetchGalleryItems,
  fetchOfferTiers,
  clientConfig,
  publicUrlBase,
} from '@/lib/admin/server';
import EntityForm from '@/components/admin/EntityForm';
import OfferTierManager from '@/components/admin/OfferTierManager';

export const dynamic = 'force-dynamic';

export default async function AdminOfferEditPage({ params }) {
  const { id } = await params;
  const isNew = id === 'new';
  const record = isNew ? null : await fetchEntityRecord('offres', id);
  if (!isNew && !record) notFound();

  const relOptions = await fetchRelOptions('offres');
  const galleryItems = record ? await fetchGalleryItems('offers', record.id) : null;
  const tiers = record ? await fetchOfferTiers(record.id) : [];

  // Also fetch hotel options for the tier manager
  const hotelRelOptions = await fetchRelOptions('offer-tiers');

  return (
    // pb-24 reserves the fixed save bar's height so it can't cover the end of
    // the page (it was hiding the bottom of the Gammes panel).
    <div className="flex flex-col gap-5 pb-24">
      <div>
        <Link href="/admin/offres" className="text-sm text-bm-black/50 hover:text-bm-black">
          ← Offres
        </Link>
        <h1 className="mt-1 text-xl font-bold">
          {isNew ? 'Nouvelle offre' : (record.title_fr ?? record.slug)}
        </h1>
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
      {record ? (
        <OfferTierManager
          offerId={record.id}
          tiers={tiers}
          hotelOptions={hotelRelOptions.hotel_makkah_id ?? []}
        />
      ) : (
        <p className="text-sm text-bm-black/40">
          Enregistrez d&apos;abord l&apos;offre pour ajouter des gammes.
        </p>
      )}
    </div>
  );
}

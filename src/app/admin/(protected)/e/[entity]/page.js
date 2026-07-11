import { notFound, redirect } from 'next/navigation';
import { ADMIN_ENTITIES } from '@/lib/admin/registry';
import { fetchEntityRows } from '@/lib/admin/server';
import EntityList from '@/components/admin/EntityList';

export const dynamic = 'force-dynamic';

export default async function EntityListPage({ params }) {
  const { entity } = await params;
  if (entity === 'offres') redirect('/admin/offres'); // custom daily screen
  const config = ADMIN_ENTITIES[entity];
  if (!config) notFound();

  const rows = await fetchEntityRows(entity);
  const columns = config.listColumns.map((key) => ({
    key,
    label: config.fields.find((f) => f.name === key || `${f.name}_fr` === key)?.label ?? key,
  }));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">{config.title}</h1>
      <EntityList
        entityKey={entity}
        rows={rows}
        columns={columns}
        searchKeys={config.searchKeys}
        publishField={config.publishField}
        basePath={`/admin/e/${entity}`}
      />
    </div>
  );
}

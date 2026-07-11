import { supabaseServer } from '@/lib/supabase/server';
import SettingsForm from '@/components/admin/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const sb = await supabaseServer();
  let settings = null;
  if (sb) {
    const { data } = await sb.from('settings').select('*').eq('id', 1).maybeSingle();
    settings = data;
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">Réglages</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}

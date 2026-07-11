import { supabaseServer } from '@/lib/supabase/server';
import KeywordPanel from '@/components/admin/KeywordPanel';

export const dynamic = 'force-dynamic';

export default async function AdminSeoPage() {
  const sb = await supabaseServer();
  let groups = [];
  if (sb) {
    const { data } = await sb
      .from('keyword_checks')
      .select('*')
      .order('checked_at', { ascending: false, nullsFirst: false })
      .limit(1000);
    const byKey = new Map();
    for (const check of data ?? []) {
      const key = `${check.keyword}::${check.engine}`;
      if (!byKey.has(key)) {
        byKey.set(key, { key, keyword: check.keyword, engine: check.engine, checks: [] });
      }
      byKey.get(key).checks.push(check);
    }
    groups = [...byKey.values()];
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">SEO — suivi des mots-clés</h1>
        <p className="mt-1 text-xs text-bm-black/40">
          Relevés manuels de position (Google) et de citation (ChatGPT, Perplexity, Gemini, AI Overview).
        </p>
      </div>
      <KeywordPanel groups={groups} />
    </div>
  );
}

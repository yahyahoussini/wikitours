import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { toCsv, buildLeadsExport } from '@/lib/admin/export-utils';

export const runtime = 'nodejs';

const querySchema = z.object({
  fmt: z.enum(['csv', 'oci', 'meta']).default('csv'),
  status: z.string().max(30).optional(),
  source: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  offer: z.string().uuid().optional(),
  from: z.string().max(10).optional(),
  to: z.string().max(10).optional(),
});

export async function GET(request) {
  try {
    const auth = await supabaseServer();
    if (!auth) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    const q = parsed.data;

    let query = auth.from('leads').select('*').order('created_at', { ascending: false }).limit(5000);
    if (q.status) query = query.eq('status', q.status);
    if (q.source) query = query.eq('utm_source', q.source);
    if (q.city) query = query.eq('city', q.city);
    if (q.offer) query = query.eq('offer_id', q.offer);
    if (q.from) query = query.gte('created_at', `${q.from}T00:00:00Z`);
    if (q.to) query = query.lte('created_at', `${q.to}T23:59:59Z`);
    const { data: leads, error } = await query;
    if (error) return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });

    const { filename, rows } = buildLeadsExport(q.fmt, leads);

    return new NextResponse(toCsv(rows), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });
  }
}

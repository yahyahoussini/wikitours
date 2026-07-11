import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const querySchema = z.object({
  q: z.string().trim().max(200).optional().default(''),
  kind: z.enum(['image', 'video', 'document']).optional().nullable(),
});

/** Media library listing for the admin picker (auth: session cookie). */
export async function GET(request) {
  try {
    const auth = await supabaseServer();
    if (!auth) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      q: searchParams.get('q') ?? '',
      kind: searchParams.get('kind') || null,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }

    let query = admin
      .from('media')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80);
    if (parsed.data.kind) query = query.eq('kind', parsed.data.kind);
    if (parsed.data.q) {
      const like = `%${parsed.data.q.replaceAll('%', '')}%`;
      query = query.or(
        `path.ilike.${like},alt_fr.ilike.${like},alt_ar.ilike.${like},alt_en.ilike.${like}`,
      );
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });
    }
    return NextResponse.json({ media: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { MEDIA_BUCKET, MEDIA_LIMITS } from '@/lib/media';
import { sniffMedia, imageDimensions } from '@/lib/server/media-validation';

export const runtime = 'nodejs';

const KIND_LABEL = {
  image: 'Image (max 4 Mo)',
  video: 'Vidéo MP4/WebM (max 15 Mo)',
  document: 'PDF (max 10 Mo)',
};

const mediaRowSchema = z.object({
  path: z.string().min(1),
  kind: z.enum(['image', 'video', 'document']),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  size_kb: z.number().int().nonnegative(),
});

/**
 * Multi-purpose admin upload. Auth: Supabase session cookie. Validation is
 * fully server-side: type by magic bytes, per-kind size limits, dimensions
 * read from the binary (LAWS §8 — never trust client metadata).
 */
export async function POST(request) {
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

    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffMedia(buf);
    if (!sniffed) {
      return NextResponse.json(
        { error: 'Format non pris en charge (JPEG, PNG, WebP, AVIF, GIF, MP4, WebM, PDF).' },
        { status: 415 },
      );
    }

    if (buf.length > MEDIA_LIMITS[sniffed.kind]) {
      return NextResponse.json(
        { error: `Fichier trop volumineux — ${KIND_LABEL[sniffed.kind]}.` },
        { status: 413 },
      );
    }

    const dims = sniffed.kind === 'image' ? imageDimensions(buf, sniffed.mime) : null;
    const path = `${sniffed.kind}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${sniffed.ext}`;

    const row = mediaRowSchema.parse({
      path,
      kind: sniffed.kind,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      size_kb: Math.max(1, Math.round(buf.length / 1024)),
    });

    const { error: storageError } = await admin.storage
      .from(MEDIA_BUCKET)
      .upload(path, buf, { contentType: sniffed.mime, upsert: false });
    if (storageError) {
      // Generic message to the client; the real cause (e.g. bucket mime
      // allow-list, quota) only ever shows up server-side.
      console.error('[upload] storage error:', sniffed.mime, storageError.message ?? storageError);
      return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });
    }

    const { data: media, error: dbError } = await admin
      .from('media')
      .insert(row)
      .select()
      .single();
    if (dbError) {
      // Don't leave an orphan object behind.
      console.error('[upload] media insert error:', dbError.message ?? dbError);
      await admin.storage.from(MEDIA_BUCKET).remove([path]);
      return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });
    }

    return NextResponse.json({ media });
  } catch (err) {
    console.error('[upload] unexpected error:', err?.message ?? err);
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });
  }
}

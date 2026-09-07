import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/data/settings';
import {
  draftArticle,
  buildFactSheet,
  qualityGate,
  publishDecision,
  sampleDrafts,
  nextMorningSlot,
  MAX_PENDING_AI_DRAFTS,
} from '@/lib/server/article-drafter';
import { sendDraftReviewEmail } from '@/lib/server/marketing';

export const runtime = 'nodejs';
// One Opus 5 draft of ~10k output tokens can take a few minutes. Vercel
// enforces the plan's ceiling (Hobby ≈ 60–300 s, Pro up to 800 s with Fluid
// compute); the SDK call is capped at 280 s inside the drafter.
export const maxDuration = 300;

/**
 * Daily AI article (vercel.json cron, 04:00 UTC — three hours before the
 * 07:00 release run). Takes the next active + queued row of `article_plan`,
 * writes a trilingual article grounded only in DB facts, runs the quality
 * gate, then applies the mechanical publish decision (Réglages → Blog
 * automatique: auto-publish ON + author set + gate clean ⇒ published for the
 * next free 08:00 slot; otherwise an unpublished draft). Marks the plan row
 * `drafted` and e-mails the outcome either way. Skips (and says why) when:
 *   - no ANTHROPIC_API_KEY, or the plan is empty,
 *   - MAX_PENDING_AI_DRAFTS drafts are waiting for review (cost bound),
 *   - a seasonal row is more than 3 months ahead of its month.
 *
 * Dry-run (nothing written, same bearer token):
 *   ?dry=1&sample=1  gate + slot maths + publish decision on synthetic drafts —
 *                    needs no API key; proves the wiring end to end.
 *   ?dry=1           one REAL model call on the next plan topic, not inserted —
 *                    returns the gate, the decision and a preview.
 * Cron-only: Vercel sends `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'unconfigured' }, { status: 500 });

  const url = new URL(request.url);
  const dry = url.searchParams.get('dry') === '1';
  const sample = dry && url.searchParams.get('sample') === '1';
  const now = new Date();
  const settings = await getSettings();

  if (sample) {
    const sheet = await buildFactSheet(admin, { today: now.toISOString().slice(0, 10) });
    const sourced = [...sheet.priceSet][0] ?? 12900;
    const priceSet = new Set([...sheet.priceSet, sourced]);
    const { pass, fail } = sampleDrafts({ ownerPath: '/bab-makka', sourcedPrice: sourced });
    const ctx = { ownerPath: '/bab-makka', existingSlugs: sheet.existingSlugs, priceSet };
    const gPass = qualityGate(pass, ctx);
    const gFail = qualityGate(fail, ctx);
    return NextResponse.json({
      ok: true,
      dryRun: 'sample',
      factSheet: {
        offers: sheet.facts.offres_en_cours.length,
        hotels: sheet.facts.hotels_partenaires.length,
        faqs: sheet.facts.faq_publiee.length,
        team: sheet.facts.equipe.length,
        prices: sheet.priceSet.size,
        existingSlugs: sheet.existingSlugs.size,
        allowedLinks: sheet.allowedLinks.length,
        licence: Boolean(sheet.facts.entite.licence),
        whatsapp: Boolean(sheet.facts.entite.whatsapp),
      },
      pass: { gate: gPass, decision: publishDecision({ settings, gate: gPass }) },
      fail: { gate: gFail, decision: publishDecision({ settings, gate: gFail }) },
      slots: {
        emptyQueue: nextMorningSlot(null, now),
        afterScheduled: nextMorningSlot(new Date(now.getTime() + 3 * 86400000).toISOString(), now),
      },
      autopublish: { enabled: !!settings?.blog_autopublish, author: settings?.blog_author_name ?? null },
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ ok: true, skipped: 'no-api-key' });

  // Cost bound: never pile up drafts nobody is reviewing.
  if (!dry) {
    const { data: drafted } = await admin.from('article_plan').select('article_id').eq('status', 'drafted').not('article_id', 'is', null);
    const draftedIds = (drafted ?? []).map((r) => r.article_id);
    if (draftedIds.length) {
      const { count } = await admin
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', false)
        .in('id', draftedIds);
      const pending = count ?? 0;
      if (pending >= MAX_PENDING_AI_DRAFTS) {
        await sendDraftReviewEmail(settings, { kind: 'backlog', pending });
        return NextResponse.json({ ok: true, skipped: 'pending-cap', pending });
      }
    }
  }

  // Next topic: first active queued row whose season (if any) is within 3 months.
  const monthNow = now.getUTCMonth() + 1;
  const inWindow = (m) => !m || (m - monthNow + 12) % 12 <= 3;
  const { data: rows } = await admin
    .from('article_plan')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'queued')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  let plan = (rows ?? []).find((r) => inWindow(r.season_month));
  if (!plan && dry) {
    // No plan yet (table not migrated, or empty) — still let the model path be
    // exercised in a dry run with a representative synthetic brief.
    plan = {
      id: null,
      query_family: 'omra parents âgés accessibilité',
      angle: 'Préparer l’Omra d’un parent âgé : rythme, hôtel proche, fauteuil au Haram, médicaments. Aucun conseil médical.',
      category: 'guide',
      owner_path: '/guide-omra/checklist',
      season_month: null,
      notes: null,
    };
  }
  if (!plan) {
    await sendDraftReviewEmail(settings, { kind: 'empty-plan' });
    return NextResponse.json({ ok: true, skipped: 'empty-plan' });
  }

  let result;
  try {
    result = await draftArticle({ admin, plan, settings, now, dryRun: dry });
  } catch (err) {
    // SDK errors (auth, rate limit, network) surface here — never a 500 stack.
    result = { ok: false, error: 'api', detail: err?.message ?? String(err) };
  }

  if (dry) return NextResponse.json({ ...result, dryRun: true, plan: plan.query_family }, { status: result.ok ? 200 : 500 });

  const stamp = now.toISOString().slice(0, 16).replace('T', ' ');
  if (!result.ok) {
    await admin
      .from('article_plan')
      .update({
        notes: `${plan.notes ? plan.notes + '\n' : ''}${stamp} — échec : ${result.error}${result.detail ? ` (${result.detail})` : ''}`,
        updated_at: now.toISOString(),
      })
      .eq('id', plan.id);
    await sendDraftReviewEmail(settings, { kind: 'failed', plan, error: result.error, detail: result.detail ?? null });
    return NextResponse.json({ ok: false, error: result.error, plan: plan.query_family, usage: result.usage ?? null }, { status: 500 });
  }

  const outcome = result.decision.publish ? 'publié automatiquement' : `brouillon (${result.decision.reasons.join(' ; ')})`;
  await admin
    .from('article_plan')
    .update({
      status: 'drafted',
      article_id: result.article.id,
      drafted_at: now.toISOString(),
      notes: `${plan.notes ? plan.notes + '\n' : ''}${stamp} — « ${result.article.slug} » ${outcome}${result.gate.problems.length ? ` · problèmes : ${result.gate.problems.join(' ; ')}` : ''}`,
      updated_at: now.toISOString(),
    })
    .eq('id', plan.id);

  await sendDraftReviewEmail(settings, {
    kind: 'draft',
    plan,
    article: result.article,
    gate: result.gate,
    published: result.decision.publish,
    reasons: result.decision.reasons,
  });

  return NextResponse.json({
    ok: true,
    article: result.article,
    published: result.decision.publish,
    reasons: result.decision.reasons,
    problems: result.gate.problems,
    flags: result.gate.flags,
    needs_review: result.gate.needs_review,
    usage: result.usage,
  });
}

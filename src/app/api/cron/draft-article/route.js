import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * RETIRED (2026-09-14, content architecture decision): "all prose is generated
 * inside Claude Code sessions — no runtime LLM call anywhere, ever."
 *
 * This route used to draft one article a day through the Anthropic API (it had
 * been dormant since the $0 cost rule of 2026-09-07, gated on ANTHROPIC_API_KEY).
 * The writing now happens ahead of time (content/ARTICLE-BRIEF.md → JSON files
 * → scripts/ingest-articles.mjs at build). The URL stays so nothing that calls
 * it breaks; it answers 410 and does nothing. The cron entry was removed from
 * vercel.json. The fact sheet it shared lives on in
 * src/lib/server/article-drafter.js (buildFactSheet, used by /api/content/facts).
 */
export async function GET() {
  return NextResponse.json(
    { ok: false, retired: true, reason: 'Articles are generated ahead of time in Claude Code sessions; no runtime model call exists.' },
    { status: 410 },
  );
}

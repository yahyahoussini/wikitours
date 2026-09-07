import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { BRAND } from '@/lib/brand';
import { CITY_SLUGS, MONTH_SLUGS } from '@/lib/months';
import { GUIDE_PILLAR_SLUG, GUIDE_CHILD_SLUGS } from '@/lib/guides';
import { computeMinPrice } from '@/lib/data/content';
import { words, qualityGate, nextMorningSlot, publishDecision, toArticleRow, uniqueSlug } from './article-gate.mjs';

// The gate lives in article-gate.mjs (dependency-free) so the $0 build-time
// ingest can run it too; re-exported here so the cron route keeps one import.
export { qualityGate, nextMorningSlot, publishDecision, sampleDrafts } from './article-gate.mjs';

/**
 * API drafter — writes ONE trilingual article from the next row of
 * `article_plan`, grounded EXCLUSIVELY in facts pulled from the DB, then runs
 * the shared gate + publish decision and inserts the row.
 *
 * COST: this path calls the Anthropic API and is billed per token. It is
 * dormant unless ANTHROPIC_API_KEY is set. The owner's $0 alternative is the
 * weekly cloud routine (content/ARTICLE-BRIEF.md → content/articles/*.json →
 * scripts/ingest-articles.mjs at build), which uses the same gate.
 *
 * Why the gate exists (CLAUDE.md, LAW §10, Google's scaled-content policy): an
 * LLM will invent prices, dates and rules for a religious-travel site if
 * allowed to. The model only ever sees a FACT SHEET built from published rows,
 * must write around any missing fact, and the gate re-checks structure, links
 * and every MAD amount against that sheet before anything can publish itself.
 *
 * Never import this module client-side.
 */

export const DRAFT_MODEL = process.env.ARTICLE_DRAFT_MODEL ?? 'claude-opus-5';
/** Stop drafting while this many AI drafts sit unreviewed — bounds cost. */
export const MAX_PENDING_AI_DRAFTS = 7;

const DraftSchema = z.object({
  slug: z.string(),
  title_fr: z.string(),
  title_ar: z.string(),
  title_en: z.string(),
  excerpt_fr: z.string(),
  excerpt_ar: z.string(),
  excerpt_en: z.string(),
  body_fr: z.string(),
  body_ar: z.string(),
  body_en: z.string(),
  seo_title_fr: z.string(),
  seo_title_ar: z.string(),
  seo_title_en: z.string(),
  seo_description_fr: z.string(),
  seo_description_ar: z.string(),
  seo_description_en: z.string(),
  category: z.enum(['confiance', 'omra', 'hajj', 'hotels', 'guide']),
  internal_links: z.array(z.string()),
  facts_used: z.array(z.string()),
  needs_review: z.array(z.string()),
});

/* ---------------------------------------------------------------- facts --- */

/**
 * Everything the model is allowed to state as fact. Published rows only —
 * exactly what the public already sees — read with the service client so the
 * cron does not depend on anon RLS. Also returns the price set the gate uses
 * and the slugs/links the prompt needs. The public facts endpoint
 * (api/content/facts) serves this same object to the $0 cloud routine.
 */
export async function buildFactSheet(admin, { today }) {
  const [settingsRes, offersRes, hotelsRes, faqsRes, articlesRes, teamRes] = await Promise.all([
    admin
      .from('settings')
      .select('license_number, address_fr, phone_1, whatsapp_number, email, opening_hours_fr, gbp_rating, gbp_review_count')
      .eq('id', 1)
      .maybeSingle(),
    admin
      .from('offers')
      .select('slug, title_fr, date_start, date_end, duration_days, duration_nights, airline, land_only, starting_price, occasion:occasions(name_fr, slug), tiers:offer_tiers(label, price_double, price_triple, price_quad, price_quint, is_published)')
      .eq('is_published', true)
      .gte('date_end', today)
      .order('date_start', { ascending: true }),
    admin
      .from('hotels')
      .select('name, city, distance_to_haram_m, stars, breakfast_included')
      .eq('is_published', true)
      .order('distance_to_haram_m', { ascending: true }),
    admin
      .from('faqs')
      .select('question_fr, answer_fr, category')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .limit(80),
    // ALL articles (any status): duplicates must be avoided against drafts
    // and scheduled posts too, not just the live ones.
    admin.from('articles').select('slug, title_fr, is_published, published_at'),
    admin.from('team_members').select('name, role_fr').eq('is_published', true),
  ]);

  const s = settingsRes.data ?? {};
  const offers = (offersRes.data ?? []).map((o) => {
    const tiers = (o.tiers ?? []).filter((t) => t.is_published !== false);
    const min = computeMinPrice(tiers) ?? o.starting_price ?? null;
    return {
      titre: o.title_fr,
      url: `/omra/${o.slug}`,
      depart: o.date_start,
      retour: o.date_end,
      duree_jours: o.duration_days,
      nuits: o.duration_nights,
      compagnie: o.airline ?? null,
      sans_vol: !!o.land_only,
      occasion: o.occasion?.name_fr ?? null,
      prix_min_mad: min,
      gammes: tiers.map((t) => ({
        gamme: t.label,
        double: t.price_double,
        triple: t.price_triple,
        quad: t.price_quad,
        quint: t.price_quint,
      })),
    };
  });

  // Every MAD figure the model may legitimately quote.
  const priceSet = new Set();
  for (const o of offers) {
    if (o.prix_min_mad) priceSet.add(Number(o.prix_min_mad));
    for (const g of o.gammes) for (const k of ['double', 'triple', 'quad', 'quint']) if (g[k]) priceSet.add(Number(g[k]));
  }

  const facts = {
    entite: {
      organisation: BRAND.parent,
      marque_omra: BRAND.lockup,
      graphie_canonique: BRAND.service,
      ville: 'Casablanca',
      fondee_en: 2016,
      licence: s.license_number ?? null,
      adresse: s.address_fr ?? null,
      telephone: s.phone_1 ?? null,
      whatsapp: s.whatsapp_number ?? null,
      email: s.email ?? null,
      horaires: s.opening_hours_fr ?? null,
      note_google: s.gbp_rating ?? null,
      avis_google: s.gbp_review_count ?? null,
      villes_de_depart: Object.values(CITY_SLUGS),
      paiement: 'Aucun paiement en ligne : contrat écrit signé à l’agence, acompte versé à l’agence, reçu officiel.',
    },
    offres_en_cours: offers,
    hotels_partenaires: (hotelsRes.data ?? []).map((h) => ({
      nom: h.name,
      ville: h.city === 'makkah' ? 'La Mecque' : 'Médine',
      distance_haram_m: h.distance_to_haram_m,
      etoiles: h.stars,
      petit_dejeuner: !!h.breakfast_included,
    })),
    faq_publiee: (faqsRes.data ?? []).map((f) => ({ q: f.question_fr, r: f.answer_fr, categorie: f.category })),
    equipe: (teamRes.data ?? []).map((m) => ({ nom: m.name, role: m.role_fr })),
  };

  const articles = articlesRes.data ?? [];
  const existingSlugs = new Set(articles.map((a) => a.slug));
  const publishedArticles = articles
    .filter((a) => a.is_published && a.published_at && new Date(a.published_at) <= new Date())
    .map((a) => ({ titre: a.title_fr, url: `/blog/${a.slug}` }));

  const allowedLinks = [
    '/', '/bab-makka', '/omra-pas-cher', '/hotels-omra', '/agence-omra-casablanca', '/contact',
    '/avis', '/agrement', '/a-propos', '/barometre-prix-omra', '/omra-ramadan', '/hajj',
    `/${GUIDE_PILLAR_SLUG}`, ...GUIDE_CHILD_SLUGS.map((c) => `/${GUIDE_PILLAR_SLUG}/${c}`), '/glossaire-omra',
    ...MONTH_SLUGS.map((m) => `/omra-${m}`),
    ...Object.keys(CITY_SLUGS).map((c) => `/omra-depuis-${c}`),
    ...publishedArticles.map((a) => a.url),
  ];

  return { facts, priceSet, existingSlugs, publishedArticles, allowedLinks };
}

/* --------------------------------------------------------------- prompt --- */

function systemPrompt() {
  return `Tu es le rédacteur SEO / GEO / AEO de ${BRAND.parent}, agence de voyages marocaine de Casablanca titulaire d'une licence du ministère du Tourisme, et de son service premium Omra & Hajj « ${BRAND.lockup} ». Tu écris UN article de blog trilingue (fr = version principale, ar, en) destiné à être cité par Google et par les assistants IA (ChatGPT, Perplexity, Google AI Overviews, Copilot) sur les requêtes des pèlerins marocains et de la diaspora.

RÈGLES ABSOLUES
1. Aucun fait inventé. Tu n'utilises QUE les faits de la FICHE fournie (licence, adresse, téléphones, offres, prix, durées, compagnies, hôtels, distances, FAQ, équipe). Aucun prix, date, durée, distance, nombre, horaire, nom de compagnie, règle administrative, religieuse ou sanitaire qui n'y figure pas. Si un fait manquant serait utile, écris la phrase SANS le chiffre et ajoute une ligne dans needs_review commençant par « [À VÉRIFIER] ». Jamais de statistique, jamais « selon une étude ». N'écris jamais « [À VÉRIFIER] » dans le corps du texte.
2. Marque : « ${BRAND.service} » (sans h) est la graphie canonique ; « Bab Makkah » est interdit. L'entité est ${BRAND.parent} ; ${BRAND.service} n'est jamais présentée comme une agence indépendante.
3. Pas de superlatif invérifiable (« meilleure agence », « n°1 », « la moins chère »), pas de faux sentiment d'urgence, aucun nom de concurrent, aucun lien externe (le relecteur les ajoute), aucun conseil médical ou juridique affirmatif (renvoyer au médecin / à l'administration compétente).
4. Anti-cannibalisation : l'article SOUTIENT la page propriétaire indiquée dans le BRIEF. Il ne cible pas le mot-clé principal de cette page ; il possède SA propre famille de requêtes (celle du BRIEF) et renvoie vers la page propriétaire avec une ancre descriptive.
5. Ton : expert, chaleureux, concret, marocain (CIN, dirhams/MAD, Casablanca, aéroport Mohammed V, les villes de départ de la fiche). Pas d'auto-promotion lourde.

STRUCTURE (identique dans les trois langues)
- Premier paragraphe = chapeau « réponse d'abord » de 40 à 60 mots qui répond directement à la question de la requête, AVANT tout titre.
- 4 à 7 sections « ## » dont les titres sont formulés comme les questions ou phrases que les gens tapent réellement.
- Listes à puces, étapes numérotées et tableaux markdown dès qu'ils rendent l'information extractible.
- Une section « ## Questions fréquentes » avec exactement 3 sous-titres « ### » (une question chacun), chacun suivi d'une réponse de 40 à 60 mots, réponse directe en premier.
- Dernier paragraphe : inviter à écrire à l'agence sur WhatsApp (numéro de la fiche uniquement) et à consulter la page propriétaire.
- Liens internes en markdown vers des chemins RELATIFS préfixés par la langue : /fr/… dans body_fr, /ar/… dans body_ar, /en/… dans body_en. OBLIGATOIRE : un lien vers la page propriétaire. Facultatif : jusqu'à 3 liens parmi LIENS AUTORISÉS. Aucun autre lien.
- Longueur : body_fr 800 à 1200 mots. body_ar (arabe standard moderne, naturel pour un lecteur marocain, jamais une translittération) et body_en = adaptations fidèles, même structure, mêmes liens avec le préfixe de langue adapté.

SEO
- slug : kebab-case ASCII, 3 à 7 mots, sans année, sans « bab-makka » ni « wiki-tours », absent de SLUGS EXISTANTS.
- seo_title_* : au plus 48 caractères, SANS marque (le site ajoute « | ${BRAND.service} »), contient la requête.
- seo_description_* : 120 à 155 caractères, réponse + bénéfice, sans point d'exclamation.
- title_* (H1) : au plus 70 caractères, peut différer du seo_title.
- excerpt_* : une ou deux phrases, au plus 200 caractères.
- category : la plus juste parmi confiance / omra / hajj / hotels / guide.
- facts_used : les faits de la fiche réellement utilisés, en une ligne chacun.
- needs_review : tout ce que le relecteur humain doit vérifier ou compléter — chaque « [À VÉRIFIER] … », les images à ajouter, l'auteur à renseigner.`;
}

function userPrompt({ plan, facts, existingSlugs, publishedArticles, allowedLinks, today }) {
  return [
    `DATE DU JOUR : ${today}`,
    '',
    'BRIEF',
    `- Famille de requêtes que l'article possède : ${plan.query_family}`,
    `- Angle : ${plan.angle ?? '(libre, dans les règles)'}`,
    `- Catégorie suggérée : ${plan.category ?? '(à choisir)'}`,
    `- Page propriétaire à soutenir et à lier : ${plan.owner_path ?? '(aucune — lier /bab-makka)'}`,
    plan.season_month ? `- Mois visé : ${plan.season_month}` : null,
    plan.notes ? `- Notes du responsable : ${plan.notes}` : null,
    '',
    'FICHE (seuls faits autorisés) :',
    JSON.stringify(facts, null, 1),
    '',
    `SLUGS EXISTANTS (interdits) : ${[...existingSlugs].join(', ') || '(aucun)'}`,
    '',
    `ARTICLES DÉJÀ PUBLIÉS (ne pas refaire leur sujet) : ${publishedArticles.map((a) => `« ${a.titre} » ${a.url}`).join(' ; ') || '(aucun)'}`,
    '',
    `LIENS AUTORISÉS (chemins sans préfixe de langue — ajoute /fr, /ar ou /en) : ${allowedLinks.join(' ')}`,
    '',
    'Écris l\'article maintenant, en respectant chaque règle, et renvoie-le dans le format structuré demandé.',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/* ----------------------------------------------------------------- main --- */

/**
 * Draft one article for `plan`. Returns { ok, article, gate, decision, usage }
 * or { ok: false, error, detail }. Inserts the row unless dryRun.
 */
export async function draftArticle({ admin, plan, settings = null, now = new Date(), dryRun = false }) {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: 'no-api-key' };

  const today = now.toISOString().slice(0, 10);
  const sheet = await buildFactSheet(admin, { today });
  const client = new Anthropic({ maxRetries: 1, timeout: 280_000 });
  const system = [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }];
  const messages = [{ role: 'user', content: userPrompt({ plan, ...sheet, today }) }];

  let draft = null;
  let gate = null;
  const usage = { input: 0, output: 0 };

  // One generation, one correction pass on gate problems, then save with flags.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.messages.parse({
      model: DRAFT_MODEL,
      max_tokens: 16000,
      system,
      messages,
      output_config: { format: zodOutputFormat(DraftSchema) },
    });
    usage.input += response.usage?.input_tokens ?? 0;
    usage.output += response.usage?.output_tokens ?? 0;

    if (response.stop_reason === 'refusal') {
      return { ok: false, error: 'refusal', detail: response.stop_details?.explanation ?? null, usage };
    }
    if (response.stop_reason === 'max_tokens') return { ok: false, error: 'truncated', usage };
    if (!response.parsed_output) return { ok: false, error: 'parse', usage };

    draft = response.parsed_output;
    gate = qualityGate(draft, { ownerPath: plan.owner_path, existingSlugs: sheet.existingSlugs, priceSet: sheet.priceSet });
    if (gate.ok) break;

    messages.push(
      { role: 'assistant', content: JSON.stringify(draft) },
      {
        role: 'user',
        content: `Corrige ces problèmes et renvoie l'article complet dans le même format :\n- ${gate.problems.join('\n- ')}`,
      },
    );
  }

  // A draft that still fails after the retry is saved anyway — unpublished,
  // with the problems listed for the reviewer — rather than losing the day.
  const slug = uniqueSlug(draft.slug, sheet.existingSlugs, plan.query_family);

  const { data: last } = await admin
    .from('articles')
    .select('published_at')
    .gt('published_at', now.toISOString())
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const slot = nextMorningSlot(last?.published_at ?? null, now);

  const row = { ...toArticleRow(draft, { plan, settings, slug }), published_at: slot };
  const decision = publishDecision({ settings, gate });
  row.is_published = decision.publish;
  const fullGate = { ...gate, needs_review: draft.needs_review ?? [], facts_used: draft.facts_used ?? [] };

  if (dryRun) {
    const { body_fr, body_ar, body_en, ...meta } = row;
    return {
      ok: true,
      dryRun: true,
      row: meta,
      words: { fr: words(body_fr), ar: words(body_ar), en: words(body_en) },
      body_fr_preview: body_fr.slice(0, 1200),
      gate: fullGate,
      decision,
      usage,
    };
  }

  const { data: inserted, error } = await admin.from('articles').insert(row).select('id').single();
  if (error) return { ok: false, error: 'insert', detail: error.message, usage };

  return {
    ok: true,
    article: {
      id: inserted.id,
      slug,
      title_fr: draft.title_fr,
      published_at: slot,
      is_published: decision.publish,
      supports_path: row.supports_path,
    },
    gate: fullGate,
    decision,
    usage,
  };
}

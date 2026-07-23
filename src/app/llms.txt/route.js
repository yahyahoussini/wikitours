import { BRAND } from '@/lib/brand';
import { FALLBACK_LOCALE, pickLang, getDictionary } from '@/lib/i18n';
import { absoluteUrl } from '@/lib/seo';
import { getPublishedOffers, getHotels, getArticles, getFaqs, computeMinPrice } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';

export const runtime = 'nodejs';
export const revalidate = 3600;

/**
 * /llms.txt — the emerging convention for handing AI answer engines a curated,
 * factual map of the site. Generated from the DB (same source as the sitemap)
 * so prices and departures can never drift from what the pages show.
 *
 * SECURITY: settings holds server tokens (Meta CAPI, TikTok, IndexNow). Only
 * the explicitly public fields below may ever be read here.
 */
export async function GET() {
  const [settings, offers, hotels, articles, faqs] = await Promise.all([
    getSettings(),
    getPublishedOffers(),
    getHotels(),
    getArticles(20),
    getFaqs(),
  ]);

  const L = FALLBACK_LOCALE;
  const t = getDictionary(L);
  const nf = new Intl.NumberFormat('fr-MA');
  const url = (path) => absoluteUrl(L, path);
  const out = [];

  out.push(`# ${BRAND.parent}`, '');
  // Verbatim the same canonical string as Organization.description — an AI that
  // reads both must find them identical, not merely similar.
  out.push(`> ${t.brand.description}`, '');
  // Freshness: the file is regenerated from the DB (revalidate 3600), so the
  // render date IS the data date.
  out.push(`Dernière mise à jour : ${new Date().toISOString().slice(0, 10)}`, '');
  out.push(
    `${BRAND.service} est le service premium Omra & Hajj de ${BRAND.parent}, jamais une entité indépendante. Nom exact de la marque : « ${BRAND.lockup} ». La graphie « Bab Makka » est une variante secondaire.`,
    '',
  );

  // Facts — public settings fields only.
  const facts = [
    settings?.license_number ? `- Licence / agrément : ${settings.license_number}` : null,
    settings?.whatsapp_number ? `- WhatsApp : ${settings.whatsapp_number}` : null,
    settings?.phone_1 ? `- Téléphone : ${settings.phone_1}` : null,
    settings?.email ? `- E-mail : ${settings.email}` : null,
    pickLang(settings, 'address', L) ? `- Adresse : ${pickLang(settings, 'address', L)}` : null,
    settings?.gbp_rating && settings?.gbp_review_count
      ? `- Note Google : ${settings.gbp_rating}/5 (${settings.gbp_review_count} avis)`
      : null,
    `- Langues du site : fr, ar, en`,
    `- Devise des prix : MAD (dirham marocain), par personne`,
  ].filter(Boolean);
  if (facts.length) out.push('## Informations', '', ...facts, '');

  if (offers.length) {
    out.push(`## Offres Omra publiées (${offers.length})`, '');
    for (const o of offers) {
      const title = pickLang(o, 'title', L) ?? o.slug;
      const min = computeMinPrice(o.tiers) ?? o.starting_price;
      const bits = [
        o.date_start && o.date_end ? `du ${o.date_start} au ${o.date_end}` : null,
        min != null ? `à partir de ${nf.format(min)} MAD/personne` : null,
        o.duration_days ? `${o.duration_days} jours` : null,
        o.occasion ? pickLang(o.occasion, 'name', L) : null,
        o.status === 'full' ? 'complet' : o.status === 'few_left' ? 'dernières places' : 'ouvert',
      ].filter(Boolean);
      out.push(`- [${title}](${url(`/omra/${o.slug}`)}) — ${bits.join(', ')}.`);
    }
    out.push('');
  }

  if (hotels.length) {
    out.push(`## Hôtels partenaires (${hotels.length})`, '');
    for (const h of hotels) {
      const bits = [
        h.city === 'makkah' ? 'La Mecque' : 'Médine',
        h.stars ? `${h.stars} étoiles` : null,
        h.distance_to_haram_m != null ? `à ${h.distance_to_haram_m} m du Haram` : null,
      ].filter(Boolean);
      out.push(`- [${h.name}](${url(`/hotel/${h.slug}`)}) — ${bits.join(', ')}.`);
    }
    out.push('');
  }

  // Full Q&A corpus — the exact strings rendered on-page (same DB rows), so an
  // answer engine quoting this file quotes the site verbatim.
  if (faqs.length) {
    out.push(`## Questions fréquentes — réponses officielles de l'agence (${faqs.length})`, '');
    for (const f of faqs) {
      const q = pickLang(f, 'question', L);
      const a = pickLang(f, 'answer', L);
      if (q && a) out.push(`**${q}**`, a, '');
    }
  }

  if (articles.length) {
    out.push('## Guide & conseils', '');
    for (const a of articles) {
      out.push(`- [${pickLang(a, 'title', L) ?? a.slug}](${url(`/blog/${a.slug}`)})`);
    }
    out.push('');
  }

  out.push(
    '## Pages principales',
    '',
    `- [Accueil](${url('')})`,
    `- [Bab Makkah — toutes les offres Omra](${url('/bab-makka')})`,
    `- [Comparatif des hôtels Omra par distance du Haram](${url('/hotels-omra')})`,
    `- [Hajj](${url('/hajj')})`,
    `- [Agence Omra Casablanca](${url('/agence-omra-casablanca')})`,
    `- [Guide Omra — préparer son départ](${url('/guide-omra')})`,
    `- [Glossaire de l'Omra](${url('/glossaire-omra')})`,
    `- [Baromètre des prix Omra (données réelles)](${url('/barometre-prix-omra')})`,
    `- [Avis des pèlerins](${url('/avis')})`,
    `- [Notre agrément](${url('/agrement')})`,
    `- [Qui sommes-nous](${url('/a-propos')})`,
    `- [Contact](${url('/contact')})`,
    `- [Plan du site (XML)](${url('').replace(`/${L}`, '')}/sitemap.xml)`,
    '',
    '## À savoir',
    '',
    '- Aucun paiement en ligne : la réservation se confirme par téléphone puis par contrat écrit signé à l\'agence, avec reçu officiel.',
    '- Les prix affichés sont par personne, en MAD, et dépendent de la gamme (économique / confort / premium / VIP) et du type de chambre (double / triple / quadruple / quintuple).',
    '- Les offres passées sont retirées automatiquement ; ce fichier ne liste que les départs publiés et à venir.',
    '',
  );

  return new Response(out.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

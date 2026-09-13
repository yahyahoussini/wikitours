/**
 * Topical cluster map — the ONE source for internal linking between the
 * pillars (/bab-makka, /hajj), the commercial hubs and the blog/guide cluster
 * pages. Nothing is hand-placed in a template:
 *   - the pillar renders every page of every cluster from this map (ClusterIndex)
 *   - every cluster page renders its pillar, its mandatory targets and its
 *     siblings from this map (ClusterLinks)
 *   - a hub lists the articles that support it (RelatedArticles → ownerPathOf)
 * An article joins a cluster by, in order: its explicit entry below, its admin
 * `supports_path` (which page the article supports), or its `category` — so an
 * article the weekly routine adds is wired the moment it is published, with no
 * template change. Anchors are dictionary strings (src/i18n/*.json → clusters).
 */

export const CLUSTERS = [
  {
    id: 'A',
    pillar: '/bab-makka',
    commercial: true,
    pages: ['/omra-pas-cher', '/omra-5-etoiles', '/omra-ramadan', '/hotels-omra'],
    dynamic: ['occasions', 'months', 'cities'], // DB occasion hubs (/omra-{slug}), indexable month + city landers
    articles: [],
  },
  {
    id: 'B',
    pillar: '/agence-omra-casablanca',
    commercial: true,
    pages: ['/agrement', '/avis', '/presse', '/a-propos', '/equipe'],
    articles: ['comment-verifier-agence-omra-agreee-maroc', 'comment-choisir-agence-omra', 'omra-groupe-ou-individuel'],
  },
  {
    id: 'C',
    pillar: '/omra-pas-cher',
    commercial: true,
    pages: ['/barometre-prix-omra', '/guide-omra/budget'],
    articles: ['prix-omra-maroc-par-gamme-et-mois', 'gammes-omra-economique-vip', 'budget-argent-poche-omra'],
  },
  {
    id: 'D',
    pillar: '/omra-ramadan',
    commercial: true,
    pages: ['/guide-omra/meilleure-periode'],
    dynamic: ['months'],
    articles: [
      'quand-reserver-omra-calendrier', 'omra-ramadan-2027-quand-reserver', 'omra-10-derniers-jours-ramadan-2027',
      'ramadan-2027-dates-calendrier', 'quelle-periode-ramadan-choisir-omra', 'journee-ramadan-la-mecque',
      'jeuner-pendant-omra-ramadan', 'omra-vacances-scolaires', 'omra-octobre-meteo-affluence', 'omra-8-jours-ou-15-jours',
    ],
  },
  {
    id: 'E',
    pillar: '/guide-omra',
    commercial: false,
    pages: [
      '/guide-omra/documents-visa', '/guide-omra/femme-mahram', '/guide-omra/budget', '/guide-omra/rituels',
      '/guide-omra/checklist', '/guide-omra/meilleure-periode', '/glossaire-omra',
    ],
    articles: [
      'premiere-omra-7-erreurs-a-eviter', 'invocations-dua-omra', 'vaccins-sante-omra', 'application-nusuk-guide',
      'assurance-voyage-omra', 'bagages-omra-restrictions', 'telephone-internet-arabie-saoudite', 'omra-badal-pour-un-proche',
      'combien-de-fois-omra', 'imprevus-pendant-omra', 'omra-en-famille-enfants-parents-ages',
    ],
  },
  {
    id: 'F',
    pillar: '/hotels-omra',
    commercial: true,
    pages: [],
    dynamic: ['hotels'],
    articles: ['que-visiter-la-mecque', 'que-visiter-medine-ziyara', 'train-al-haramain-mecque-medine'],
  },
  {
    id: 'G',
    pillar: '/hajj',
    commercial: true,
    pages: [],
    articles: [
      'difference-omra-hajj', 'hajj-maroc-inscription-quota', 'loterie-hajj-maroc', 'pas-tire-au-sort-hajj-omra',
      'hajj-ministere-ou-agence', 'cout-hajj-maroc',
    ],
  },
];

/** Where an article with no explicit entry and no supports_path lands, by category. */
const CATEGORY_CLUSTER = { hajj: 'G', hotels: 'F', guide: 'E', confiance: 'B', omra: 'D' };

/**
 * The mandatory contextual links (owner brief) — target paths, or a dynamic
 * kind resolved against live data at render time: 'months' (the indexable
 * month landers), 'departures' (the live departures), 'school-holiday-departure'
 * (the live departure whose slug says vacances-scolaires).
 */
export const MANDATORY_LINKS = {
  'comment-verifier-agence-omra-agreee-maroc': ['/agence-omra-casablanca', '/agrement'],
  'comment-choisir-agence-omra': ['/agence-omra-casablanca'],
  'prix-omra-maroc-par-gamme-et-mois': ['/omra-pas-cher', '/barometre-prix-omra'],
  'quand-reserver-omra-calendrier': ['/omra-ramadan', 'months'],
  'omra-ramadan-2027-quand-reserver': ['/omra-ramadan'],
  'omra-vacances-scolaires': ['school-holiday-departure'],
  'difference-omra-hajj': ['/hajj', '/bab-makka'],
  'omra-8-jours-ou-15-jours': ['departures'],
  'gammes-omra-economique-vip': ['/omra-5-etoiles', '/omra-pas-cher'],
  'que-visiter-la-mecque': ['/hotels-omra'],
  'que-visiter-medine-ziyara': ['/hotels-omra'],
};

/** The Hajj → Omra bridge: rejected lottery applicants have budget and intent. */
export const HAJJ_BRIDGE_SLUGS = ['loterie-hajj-maroc', 'hajj-maroc-inscription-quota', 'pas-tire-au-sort-hajj-omra', 'hajj-ministere-ou-agence'];

export const clusterById = (id) => CLUSTERS.find((c) => c.id === id) ?? null;

/** The cluster a non-article page belongs to (its pillar, or one of its pages). */
export function clusterOfPath(path) {
  return CLUSTERS.find((c) => c.pillar === path || c.pages.includes(path)) ?? null;
}

/** Explicit entry → admin supports_path → category. Never null for a real row. */
export function clusterOfArticle(article) {
  if (!article) return null;
  const explicit = CLUSTERS.find((c) => c.articles.includes(article.slug));
  if (explicit) return explicit;
  if (article.supports_path) {
    const byOwner = clusterOfPath(article.supports_path);
    if (byOwner) return byOwner;
  }
  return clusterById(CATEGORY_CLUSTER[article.category] ?? 'A');
}

/** The page an article supports — what RelatedArticles lists it under. */
export function ownerPathOf(article) {
  return article?.supports_path ?? clusterOfArticle(article)?.pillar ?? null;
}

export function articlesInCluster(cluster, articles) {
  return (articles ?? []).filter((a) => clusterOfArticle(a)?.id === cluster?.id);
}

export function siblingArticles(article, articles, n = 3) {
  return articlesInCluster(clusterOfArticle(article), articles).filter((a) => a.slug !== article.slug).slice(0, n);
}

export const mandatoryTargetsFor = (slug) => MANDATORY_LINKS[slug] ?? [];
export const isHajjBridge = (slug) => HAJJ_BRIDGE_SLUGS.includes(slug);

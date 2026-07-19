/**
 * The admin CRUD engine's registry: one declarative config per entity drives
 * the generic list page, the generic form (FR/AR/EN tabs, SEO panel, gallery,
 * duplicate), the generated zod schema and revalidation. Adding a table to
 * the admin = adding an entry here (LAWS §4: admin controls everything).
 *
 * Field types: text · textarea · number · bool · date · datetime · select ·
 * rel (foreign key) · text3 · textarea3 · md3 (trilingual: name_fr/_ar/_en).
 */

export const ADMIN_ENTITIES = {
  occasions: {
    table: 'occasions',
    title: 'Occasions',
    publishField: 'is_published',
    orderBy: 'sort_order',
    listColumns: ['name_fr', 'slug', 'sort_order'],
    searchKeys: ['name_fr', 'name_ar', 'name_en', 'slug'],
    hasSeo: true,
    hasGallery: false,
    labelField: 'name_fr',
    fields: [
      { name: 'slug', type: 'text', label: 'Slug', required: true },
      { name: 'name', type: 'text3', label: 'Nom' },
      { name: 'description', type: 'textarea3', label: 'Description' },
      { name: 'sort_order', type: 'number', label: 'Ordre' },
    ],
  },

  hotels: {
    table: 'hotels',
    title: 'Hôtels',
    publishField: 'is_published',
    orderBy: 'name',
    listColumns: ['name', 'city', 'distance_to_haram_m', 'stars'],
    searchKeys: ['name', 'slug', 'city'],
    hasSeo: true,
    hasGallery: true,
    labelField: 'name',
    fields: [
      { name: 'slug', type: 'text', label: 'Slug', required: true },
      { name: 'name', type: 'text', label: 'Nom', required: true },
      {
        name: 'city',
        type: 'select',
        label: 'Ville',
        required: true,
        options: [
          { value: 'makkah', label: 'La Mecque' },
          { value: 'madinah', label: 'Médine' },
        ],
      },
      { name: 'distance_to_haram_m', type: 'number', label: 'Distance au Haram (m)' },
      { name: 'stars', type: 'number', label: 'Étoiles (1–5)' },
      { name: 'breakfast_included', type: 'bool', label: 'Petit-déjeuner inclus' },
      { name: 'logo_path', type: 'media', label: 'Logo de l’hôtel', accept: 'image/jpeg,image/png,image/webp,image/avif' },
      { name: 'description', type: 'textarea3', label: 'Description' },
    ],
  },

  destinations: {
    table: 'destinations',
    title: 'Destinations',
    publishField: 'is_published',
    orderBy: 'sort_order',
    listColumns: ['name_fr', 'slug', 'sort_order'],
    searchKeys: ['name_fr', 'name_ar', 'name_en', 'slug'],
    hasSeo: false,
    hasGallery: true,
    labelField: 'name_fr',
    fields: [
      { name: 'slug', type: 'text', label: 'Slug', required: true },
      { name: 'name', type: 'text3', label: 'Nom' },
      { name: 'tagline', type: 'text3', label: 'Accroche' },
      { name: 'sort_order', type: 'number', label: 'Ordre' },
    ],
  },

  temoignages: {
    table: 'testimonials',
    title: 'Témoignages',
    publishField: 'is_published',
    orderBy: 'sort_order',
    listColumns: ['author_name', 'author_city', 'kind', 'rating'],
    searchKeys: ['author_name', 'author_city', 'content_fr'],
    hasSeo: false,
    hasGallery: true, // video reels + screenshots attach here
    labelField: 'author_name',
    fields: [
      {
        name: 'kind',
        type: 'select',
        label: 'Type',
        required: true,
        options: [
          { value: 'text', label: 'Texte' },
          { value: 'video', label: 'Vidéo' },
          { value: 'screenshot', label: 'Capture d’écran' },
        ],
      },
      { name: 'author_name', type: 'text', label: 'Nom' },
      { name: 'author_city', type: 'text', label: 'Ville' },
      { name: 'trip_label', type: 'text3', label: 'Voyage' },
      { name: 'content', type: 'textarea3', label: 'Contenu' },
      { name: 'rating', type: 'number', label: 'Note (1–5)' },
      { name: 'offer_id', type: 'rel', label: 'Offre liée', relTable: 'offers', relLabel: 'title_fr' },
      { name: 'sort_order', type: 'number', label: 'Ordre' },
    ],
  },

  faqs: {
    table: 'faqs',
    title: 'FAQs',
    publishField: 'is_published',
    orderBy: 'sort_order',
    listColumns: ['question_fr', 'category', 'sort_order'],
    searchKeys: ['question_fr', 'question_ar', 'question_en', 'category'],
    hasSeo: false,
    hasGallery: false,
    labelField: 'question_fr',
    fields: [
      { name: 'question', type: 'textarea3', label: 'Question' },
      { name: 'answer', type: 'textarea3', label: 'Réponse' },
      { name: 'category', type: 'text', label: 'Catégorie' },
      { name: 'sort_order', type: 'number', label: 'Ordre' },
    ],
  },

  articles: {
    table: 'articles',
    title: 'Articles',
    publishField: 'is_published',
    orderBy: 'published_at',
    orderDesc: true,
    listColumns: ['title_fr', 'category', 'author_name'],
    searchKeys: ['title_fr', 'title_ar', 'title_en', 'slug', 'category'],
    hasSeo: true,
    hasGallery: true,
    labelField: 'title_fr',
    fields: [
      { name: 'slug', type: 'text', label: 'Slug', required: true },
      { name: 'title', type: 'text3', label: 'Titre' },
      { name: 'excerpt', type: 'textarea3', label: 'Extrait' },
      { name: 'body', type: 'md3', label: 'Corps (markdown)' },
      {
        name: 'category',
        type: 'select',
        label: 'Catégorie',
        options: [
          { value: 'confiance', label: 'Confiance' },
          { value: 'omra', label: 'Omra' },
          { value: 'hajj', label: 'Hajj' },
          { value: 'hotels', label: 'Hôtels' },
          { value: 'guide', label: 'Guide' },
        ],
      },
      { name: 'author_name', type: 'text', label: 'Auteur' },
      { name: 'reviewed_by', type: 'text', label: 'Relu par' },
      { name: 'published_at', type: 'datetime', label: 'Date de publication' },
    ],
  },

  'landing-pages': {
    table: 'landing_pages',
    title: 'Landing Pages',
    publishField: 'is_published',
    orderBy: 'created_at',
    orderDesc: true,
    listColumns: ['title_fr', 'slug', 'cta_target'],
    searchKeys: ['title_fr', 'title_ar', 'title_en', 'slug'],
    hasSeo: true,
    hasGallery: true,
    labelField: 'title_fr',
    publicPath: (row) => (row?.slug ? `/lp/${row.slug}` : null),
    fields: [
      { name: 'slug', type: 'text', label: 'Slug', required: true },
      { name: 'title', type: 'text3', label: 'Titre' },
      { name: 'subtitle', type: 'text3', label: 'Sous-titre' },
      { name: 'body_md', type: 'md3', label: 'Corps (markdown)' },
      { name: 'cta_label', type: 'text3', label: 'Libellé CTA' },
      {
        name: 'cta_target',
        type: 'select',
        label: 'Cible du CTA',
        options: [
          { value: 'offer', label: 'Offre' },
          { value: 'babmakkah', label: 'Bab Makkah' },
          { value: 'whatsapp', label: 'WhatsApp' },
        ],
      },
      { name: 'cta_offer_id', type: 'rel', label: 'Offre du CTA', relTable: 'offers', relLabel: 'title_fr' },
      { name: 'show_lead_form', type: 'bool', label: 'Formulaire de demande' },
      { name: 'noindex', type: 'bool', label: 'Noindex (exclu de Google)' },
    ],
  },

  annonces: {
    table: 'announcements',
    title: 'Annonces',
    publishField: 'is_active',
    orderBy: 'created_at',
    orderDesc: true,
    listColumns: ['text_fr', 'variant', 'starts_at', 'ends_at'],
    searchKeys: ['text_fr', 'text_ar', 'text_en'],
    hasSeo: false,
    hasGallery: false,
    labelField: 'text_fr',
    duplicateDisabled: true,
    fields: [
      { name: 'text', type: 'text3', label: 'Texte' },
      { name: 'link', type: 'text', label: 'Lien (optionnel)' },
      {
        name: 'variant',
        type: 'select',
        label: 'Style',
        options: [
          { value: 'info', label: 'Info (bleu)' },
          { value: 'gold', label: 'Or (Bab Makkah)' },
        ],
      },
      { name: 'starts_at', type: 'datetime', label: 'Début' },
      { name: 'ends_at', type: 'datetime', label: 'Fin' },
    ],
  },

  menus: {
    table: 'menus',
    title: 'Menus',
    publishField: 'is_active',
    orderBy: 'sort_order',
    listColumns: ['label_fr', 'location', 'href', 'sort_order'],
    searchKeys: ['label_fr', 'href'],
    hasSeo: false,
    hasGallery: false,
    labelField: 'label_fr',
    duplicateDisabled: true,
    fields: [
      {
        name: 'location',
        type: 'select',
        label: 'Emplacement',
        required: true,
        options: [
          { value: 'header', label: 'En-tête' },
          { value: 'footer_col1', label: 'Pied de page — colonne 1' },
          { value: 'footer_col2', label: 'Pied de page — colonne 2' },
        ],
      },
      { name: 'label', type: 'text3', label: 'Libellé' },
      { name: 'href', type: 'text', label: 'Lien', required: true },
      { name: 'sort_order', type: 'number', label: 'Ordre' },
    ],
  },

  equipe: {
    table: 'team_members',
    title: 'Équipe',
    publishField: 'is_published',
    orderBy: 'sort_order',
    listColumns: ['name', 'role_fr', 'sort_order'],
    searchKeys: ['name', 'role_fr'],
    hasSeo: false,
    hasGallery: true,
    labelField: 'name',
    fields: [
      { name: 'name', type: 'text', label: 'Nom', required: true },
      { name: 'role', type: 'text3', label: 'Rôle' },
      { name: 'sameas_url', type: 'text', label: 'Profil public (LinkedIn…) — schéma Person sameAs' },
      { name: 'sort_order', type: 'number', label: 'Ordre' },
    ],
  },

  services: {
    table: 'services',
    title: 'Services (Voyages)',
    publishField: 'is_published',
    orderBy: 'sort_order',
    listColumns: ['name_fr', 'section', 'sort_order'],
    searchKeys: ['name_fr', 'name_ar', 'name_en', 'slug'],
    hasSeo: false,
    hasGallery: true,
    labelField: 'name_fr',
    fields: [
      { name: 'slug', type: 'text', label: 'Slug', required: true },
      {
        name: 'section',
        type: 'select',
        label: 'Section',
        required: true,
        options: [
          { value: 'individuels', label: 'Individuels' },
          { value: 'groupes', label: 'Groupes' },
          { value: 'incentive', label: 'Incentive' },
        ],
      },
      { name: 'name', type: 'text3', label: 'Nom' },
      { name: 'description', type: 'textarea3', label: 'Description' },
      { name: 'sort_order', type: 'number', label: 'Ordre' },
    ],
  },

  'pages-villes': {
    table: 'city_pages',
    title: 'Pages villes (Omra depuis…)',
    // The publish toggle IS the index switch: off ⇒ the public page stays
    // noindex (anti-doorway, Phase 4 A2 §12). The page also self-noindexes
    // while the intro is empty, even if the toggle is on.
    publishField: 'is_indexable',
    orderBy: 'slug',
    listColumns: ['slug', 'updated_at'],
    searchKeys: ['slug', 'intro_fr'],
    hasSeo: false,
    hasGallery: false,
    labelField: 'slug',
    duplicateDisabled: true,
    publicPath: (row) => (row?.slug ? `/omra-depuis-${row.slug}` : null),
    fields: [
      {
        name: 'slug',
        type: 'select',
        label: 'Ville',
        required: true,
        options: [
          { value: 'casablanca', label: 'Casablanca' },
          { value: 'rabat', label: 'Rabat' },
          { value: 'marrakech', label: 'Marrakech' },
          { value: 'fes', label: 'Fès' },
          { value: 'tanger', label: 'Tanger' },
          { value: 'agadir', label: 'Agadir' },
          { value: 'meknes', label: 'Meknès' },
          { value: 'oujda', label: 'Oujda' },
        ],
      },
      { name: 'intro', type: 'textarea3', label: 'Introduction locale (contenu unique de la ville)' },
      { name: 'logistics', type: 'textarea3', label: 'Logistique de départ depuis cette ville' },
    ],
  },

  guides: {
    table: 'guide_pages',
    title: 'Guide Omra (pilier + chapitres)',
    publishField: 'is_published',
    orderBy: 'slug',
    listColumns: ['slug', 'title_fr', 'author_name'],
    searchKeys: ['slug', 'title_fr', 'title_ar', 'title_en'],
    hasSeo: false,
    hasGallery: false,
    labelField: 'slug',
    duplicateDisabled: true,
    publicPath: (row) =>
      row?.slug === 'guide-omra' ? '/guide-omra' : row?.slug ? `/guide-omra/${row.slug}` : null,
    fields: [
      {
        name: 'slug',
        type: 'select',
        label: 'Page',
        required: true,
        options: [
          { value: 'guide-omra', label: 'Pilier — Guide Omra' },
          { value: 'documents-visa', label: 'Documents & visa' },
          { value: 'femme-mahram', label: 'Femme & mahram' },
          { value: 'budget', label: 'Budget' },
          { value: 'rituels', label: 'Rituels' },
          { value: 'checklist', label: 'Checklist' },
          { value: 'meilleure-periode', label: 'Meilleure période' },
        ],
      },
      { name: 'title', type: 'text3', label: 'Titre' },
      { name: 'summary', type: 'textarea3', label: 'Réponse directe (lede, 2 phrases)' },
      { name: 'body', type: 'md3', label: 'Corps (markdown)' },
      { name: 'author_name', type: 'text', label: 'Auteur (personne réelle)' },
      { name: 'author_sameas_url', type: 'text', label: 'Profil public de l’auteur (LinkedIn…)' },
      { name: 'is_indexable', type: 'bool', label: 'Indexable (uniquement quand le contenu est complet)' },
    ],
  },

  glossaire: {
    table: 'glossary_terms',
    title: 'Glossaire Omra',
    publishField: 'is_published',
    orderBy: 'sort_order',
    listColumns: ['term_fr', 'slug', 'sort_order'],
    searchKeys: ['term_fr', 'term_ar', 'term_en', 'slug'],
    hasSeo: false,
    hasGallery: false,
    labelField: 'term_fr',
    publicPath: () => '/glossaire-omra',
    fields: [
      { name: 'slug', type: 'text', label: 'Slug (ancre)', required: true },
      { name: 'term', type: 'text3', label: 'Terme' },
      { name: 'definition', type: 'textarea3', label: 'Définition (réponse directe d’abord)' },
      { name: 'sort_order', type: 'number', label: 'Ordre' },
    ],
  },

  redirections: {
    table: 'redirects',
    title: 'Redirections',
    publishField: 'is_active',
    orderBy: 'created_at',
    orderDesc: true,
    listColumns: ['from_path', 'to_path', 'permanent'],
    searchKeys: ['from_path', 'to_path'],
    hasSeo: false,
    hasGallery: false,
    labelField: 'from_path',
    duplicateDisabled: true,
    fields: [
      { name: 'from_path', type: 'text', label: 'Depuis (ex. /ancienne-page)', required: true },
      { name: 'to_path', type: 'text', label: 'Vers (ex. /fr/offres/...)', required: true },
      { name: 'permanent', type: 'bool', label: 'Permanente (308)' },
    ],
  },

  'offer-tiers': {
    table: 'offer_tiers',
    title: 'Gammes',
    publishField: 'is_published',
    orderBy: 'sort_order',
    listColumns: ['label', 'offer_id', 'price_double'],
    searchKeys: ['label'],
    hasSeo: false,
    hasGallery: false,
    labelField: 'label',
    duplicateDisabled: true,
    fields: [
      { name: 'offer_id', type: 'rel', label: 'Offre', relTable: 'offers', relLabel: 'title_fr', required: true },
      { name: 'sort_order', type: 'number', label: 'Ordre', default: 0 },
      {
        name: 'label', type: 'select', label: 'Gamme', required: true,
        options: [
          { value: 'economique', label: 'Économique' },
          { value: 'confort', label: 'Confort' },
          { value: 'premium', label: 'Premium' },
          { value: 'vip', label: 'VIP' },
        ],
      },
      { name: 'hotel_makkah_id', type: 'rel', label: 'Hôtel La Mecque', relTable: 'hotels', relLabel: 'name', relFilter: { city: 'makkah' } },
      { name: 'hotel_madinah_id', type: 'rel', label: 'Hôtel Médine', relTable: 'hotels', relLabel: 'name', relFilter: { city: 'madinah' } },
      { name: 'nights_makkah', type: 'number', label: 'Nuits à La Mecque' },
      { name: 'nights_madinah', type: 'number', label: 'Nuits à Médine' },
      { name: 'distance_to_haram_m', type: 'number', label: 'Distance au Haram (m)' },
      { name: 'breakfast_included', type: 'bool', label: 'Petit-déjeuner inclus' },
      { name: 'price_double', type: 'number', label: 'Prix ch. double (MAD/pers)' },
      { name: 'price_triple', type: 'number', label: 'Prix ch. triple (MAD/pers)' },
      { name: 'price_quad', type: 'number', label: 'Prix ch. quadruple (MAD/pers)' },
      { name: 'price_quint', type: 'number', label: 'Prix ch. quintuple (MAD/pers)' },
    ],
  },

  offres: {
    table: 'offers',
    title: 'Offres',
    publishField: 'is_published',
    orderBy: 'date_start',
    listColumns: ['title_fr', 'date_start', 'status'],
    searchKeys: ['title_fr', 'title_ar', 'title_en', 'slug', 'airline'],
    hasSeo: true,
    hasGallery: true,
    labelField: 'title_fr',
    publicPath: (row) => (row?.slug ? `/offres/${row.slug}` : null),
    fields: [
      { name: 'slug', type: 'text', label: 'Slug', required: true },
      { name: 'title', type: 'text3', label: 'Titre' },
      { name: 'summary', type: 'textarea3', label: 'Résumé' },
      { name: 'occasion_id', type: 'rel', label: 'Occasion', relTable: 'occasions', relLabel: 'name_fr' },
      { name: 'duration_days', type: 'number', label: 'Jours' },
      { name: 'duration_nights', type: 'number', label: 'Nuits' },
      { name: 'airline', type: 'text', label: 'Compagnie aérienne' },
      { name: 'date_start', type: 'date', label: 'Départ' },
      { name: 'date_end', type: 'date', label: 'Retour' },
      {
        name: 'status', type: 'select', label: 'Statut',
        options: [
          { value: 'open', label: 'Places disponibles' },
          { value: 'few_left', label: 'Dernières places' },
          { value: 'full', label: 'Complet' },
        ],
      },
      { name: 'seats_remaining', type: 'number', label: 'Places restantes (laisser vide si non suivi)' },
      { name: 'is_featured', type: 'bool', label: 'Mise en avant' },
      { name: 'land_only', type: 'bool', label: 'Sans vol (land only)' },
      { name: 'inclusions', type: 'textarea3', label: 'Inclusions' },
      { name: 'exclusions', type: 'textarea3', label: 'Non inclus (une ligne par élément)' },
      { name: 'conditions', type: 'textarea3', label: 'Conditions' },
    ],
  },
};

/** Compute cheapest price across all tiers of an offer. */
export function computeStartingPrice(tiers) {
  if (!tiers?.length) return null;
  const allPrices = [];
  for (const tier of tiers) {
    for (const key of ['price_double', 'price_triple', 'price_quad', 'price_quint']) {
      if (typeof tier[key] === 'number' && tier[key] > 0) allPrices.push(tier[key]);
    }
  }
  return allPrices.length ? Math.min(...allPrices) : null;
}

/** Entity-type key for the polymorphic galleries table (= real table name). */
export function galleryEntityType(entityKey) {
  return ADMIN_ENTITIES[entityKey]?.table ?? null;
}

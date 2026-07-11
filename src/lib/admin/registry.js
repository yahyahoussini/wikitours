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
      { name: 'logo_path', type: 'media', label: 'Logo de l’hôtel', accept: 'image/jpeg,image/png,image/webp' },
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
      { name: 'sort_order', type: 'number', label: 'Ordre' },
    ],
  },

  timeline: {
    table: 'timeline_items',
    title: 'Timeline',
    publishField: 'is_published',
    orderBy: 'sort_order',
    listColumns: ['title_fr', 'sort_order'],
    searchKeys: ['title_fr', 'title_ar', 'title_en'],
    hasSeo: false,
    hasGallery: false,
    labelField: 'title_fr',
    fields: [
      { name: 'title', type: 'text3', label: 'Titre' },
      { name: 'body', type: 'textarea3', label: 'Texte' },
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

  offres: {
    table: 'offers',
    title: 'Offres',
    publishField: 'is_published',
    orderBy: 'date_start',
    listColumns: ['title_fr', 'tier_label', 'date_start', 'starting_price', 'status'],
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
      {
        name: 'tier_label',
        type: 'select',
        label: 'Gamme',
        options: [
          { value: 'economique', label: 'Économique' },
          { value: 'confort', label: 'Confort' },
          { value: 'premium', label: 'Premium' },
          { value: 'vip', label: 'VIP' },
        ],
      },
      { name: 'hotel_makkah_id', type: 'rel', label: 'Hôtel La Mecque', relTable: 'hotels', relLabel: 'name', relFilter: { city: 'makkah' } },
      { name: 'hotel_madinah_id', type: 'rel', label: 'Hôtel Médine', relTable: 'hotels', relLabel: 'name', relFilter: { city: 'madinah' } },
      { name: 'duration_days', type: 'number', label: 'Jours' },
      { name: 'duration_nights', type: 'number', label: 'Nuits' },
      { name: 'airline', type: 'text', label: 'Compagnie aérienne' },
      { name: 'date_start', type: 'date', label: 'Départ' },
      { name: 'date_end', type: 'date', label: 'Retour' },
      { name: 'price_double', type: 'number', label: 'Prix ch. double (MAD)' },
      { name: 'price_triple', type: 'number', label: 'Prix ch. triple (MAD)' },
      { name: 'price_quad', type: 'number', label: 'Prix ch. quadruple (MAD)' },
      { name: 'price_quint', type: 'number', label: 'Prix ch. quintuple (MAD)' },
      {
        name: 'status',
        type: 'select',
        label: 'Statut',
        options: [
          { value: 'open', label: 'Places disponibles' },
          { value: 'few_left', label: 'Dernières places' },
          { value: 'full', label: 'Complet' },
        ],
      },
      { name: 'is_featured', type: 'bool', label: 'Mise en avant' },
      { name: 'land_only', type: 'bool', label: 'Sans vol (land only)' },
      { name: 'inclusions', type: 'textarea3', label: 'Inclusions' },
      { name: 'exclusions', type: 'textarea3', label: 'Non inclus (une ligne par élément)' },
      { name: 'conditions', type: 'textarea3', label: 'Conditions' },
    ],
  },
};

/** starting_price auto = min of the per-room prices (offers save hook). */
export function computeStartingPrice(values) {
  const prices = [
    values.price_double,
    values.price_triple,
    values.price_quad,
    values.price_quint,
  ].filter((p) => typeof p === 'number' && p > 0);
  return prices.length ? Math.min(...prices) : (values.starting_price ?? null);
}

/** Entity-type key for the polymorphic galleries table (= real table name). */
export function galleryEntityType(entityKey) {
  return ADMIN_ENTITIES[entityKey]?.table ?? null;
}

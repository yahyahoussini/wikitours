import { LOCALES } from '@/lib/i18n';

/**
 * Registry of every record type a gallery can attach to (galleries are
 * polymorphic: entity_type + entity_id). Drives the admin gallery pages,
 * zod validation of gallery writes, and on-demand revalidation.
 *
 * publicPath(row) returns the locale-relative public path to revalidate, or
 * null when the surface does not exist yet (articles/landing pages get their
 * routes in a later phase — galleries saved now will simply show up then).
 */

/** settings has a smallint PK; its hero gallery uses this sentinel uuid. */
export const SETTINGS_HERO_ENTITY_ID = '00000000-0000-0000-0000-000000000001';

/** Office/agency photos (LocalBusiness landing) — second virtual gallery. */
export const SETTINGS_OFFICE_ENTITY_ID = '00000000-0000-0000-0000-000000000002';

/** Single "full team" photo shown on the home story section — third virtual. */
export const SETTINGS_TEAM_ENTITY_ID = '00000000-0000-0000-0000-000000000003';

/** Framed photo of the "Pourquoi les familles nous confient leur Omra" band —
 *  fourth virtual gallery. Falls back to hero image #2 while empty. */
export const SETTINGS_WHY_ENTITY_ID = '00000000-0000-0000-0000-000000000004';

export const GALLERY_ENTITIES = {
  offers: {
    table: 'offers',
    adminLabel: 'Offres',
    labelField: 'title_fr',
    publicPath: (row) => (row?.slug ? `/omra/${row.slug}` : null),
  },
  hotels: {
    table: 'hotels',
    adminLabel: 'Hôtels',
    labelField: 'name',
    publicPath: (row) => (row?.slug ? `/hotel/${row.slug}` : null),
  },
  destinations: {
    table: 'destinations',
    adminLabel: 'Destinations',
    labelField: 'name_fr',
    publicPath: () => '/', // destination cards live on the home page
  },
  articles: {
    table: 'articles',
    adminLabel: 'Articles',
    labelField: 'title_fr',
    publicPath: (row) => (row?.slug ? `/blog/${row.slug}` : null),
  },
  testimonials: {
    table: 'testimonials',
    adminLabel: 'Témoignages',
    labelField: 'author_name',
    publicPath: () => '/avis',
  },
  services: {
    table: 'services',
    adminLabel: 'Services (Voyages)',
    labelField: 'name_fr',
    publicPath: () => '/voyages',
  },
  landing_pages: {
    table: 'landing_pages',
    adminLabel: 'Landing pages',
    labelField: 'title_fr',
    publicPath: () => null,
  },
  team_members: {
    table: 'team_members',
    adminLabel: 'Équipe',
    labelField: 'name',
    publicPath: () => '/a-propos',
  },
  settings_hero: {
    table: null, // virtual: the site-wide hero gallery, id is the sentinel
    adminLabel: 'Héros du site',
    labelField: null,
    publicPath: () => '/',
  },
  settings_office: {
    table: null, // virtual: agency/office photos, id is the sentinel
    adminLabel: "Photos de l'agence",
    labelField: null,
    publicPath: () => '/agence-omra-casablanca',
  },
  settings_team: {
    table: null, // virtual: single full-team photo, id is the sentinel
    adminLabel: 'Photo équipe',
    labelField: null,
    publicPath: () => '/', // team block lives on the home page
  },
  settings_why: {
    table: null, // virtual: "Pourquoi nous" framed photo, id is the sentinel
    adminLabel: 'Photo « Pourquoi nous »',
    labelField: null,
    publicPath: () => '/', // why-us band lives on the home page
  },
};

export const ENTITY_TYPES = Object.keys(GALLERY_ENTITIES);

/** All locale-prefixed variants of a locale-relative path. */
export function localizedPaths(path) {
  if (!path) return [];
  return LOCALES.map((l) => `/${l}${path === '/' ? '' : path}`);
}

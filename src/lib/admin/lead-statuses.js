/**
 * Lead pipeline statuses — shared between the CRM Server Component page and its
 * client components (LeadRow / LeadsBoard / LeadDetail).
 *
 * This MUST live in a plain module (no 'use client'). If it were exported from a
 * 'use client' file, a Server Component importing it would receive a client-
 * reference proxy instead of the real array — and calls like `.some(...)` throw
 * "LEAD_STATUSES.some is not a function".
 */
export const LEAD_STATUSES = [
  { value: 'new', label: 'Nouveau' },
  { value: 'contacted', label: 'Contacté' },
  { value: 'qualified', label: 'Qualifié' },
  { value: 'paid_deposit', label: 'Acompte payé' },
  { value: 'traveled', label: 'A voyagé' },
  { value: 'lost', label: 'Perdu' },
];

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettings } from '@/app/admin/entity-actions';

const INPUT =
  'w-full rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue';

const SECTIONS = [
  {
    title: 'Langue & contact',
    fields: [
      { name: 'default_locale', label: 'Langue principale du site', type: 'select', options: [
        { value: 'fr', label: 'Français' },
        { value: 'ar', label: 'العربية' },
        { value: 'en', label: 'English' },
      ], hint: 'Appliquée aux visiteurs sans préfixe de langue — effective sous 60 s.' },
      { name: 'whatsapp_number', label: 'WhatsApp (format +212…)' },
      { name: 'phone_1', label: 'Téléphone 1' },
      { name: 'phone_2', label: 'Téléphone 2' },
      { name: 'phone_3', label: 'Téléphone 3' },
      { name: 'email', label: 'E-mail' },
      { name: 'license_number', label: 'N° de licence' },
      { name: 'address_fr', label: 'Adresse (FR)', type: 'textarea' },
      { name: 'address_ar', label: 'Adresse (AR)', type: 'textarea', dir: 'rtl' },
      { name: 'address_en', label: 'Adresse (EN)', type: 'textarea' },
      { name: 'opening_hours_fr', label: 'Horaires (FR)', type: 'textarea' },
      { name: 'opening_hours_ar', label: 'Horaires (AR)', type: 'textarea', dir: 'rtl' },
      { name: 'opening_hours_en', label: 'Horaires (EN)', type: 'textarea' },
    ],
  },
  {
    title: 'Localisation & presse',
    fields: [
      { name: 'latitude', label: 'Latitude (ex. 33.5731)', type: 'number', step: 'any', hint: 'Coordonnées GPS de l’agence — alimentent le schema LocalBusiness (SEO local / map pack).' },
      { name: 'longitude', label: 'Longitude (ex. -7.5898)', type: 'number', step: 'any' },
      { name: 'press_url', label: 'Lien presse / média (ex. article Yabiladi)', hint: 'Affiché sur la page /presse comme couverture média (E-E-A-T).' },
    ],
  },
  {
    title: 'Notre histoire & équipe',
    fields: [
      { name: 'story_fr', label: 'Notre histoire (FR)', type: 'textarea', rows: 5, hint: 'Séparez les paragraphes par une ligne vide.' },
      { name: 'story_ar', label: 'Notre histoire (AR)', type: 'textarea', rows: 5, dir: 'rtl' },
      { name: 'story_en', label: 'Notre histoire (EN)', type: 'textarea', rows: 5 },
      { name: 'team_enabled', label: 'Afficher la section équipe', type: 'bool' },
      { name: 'team_display', label: 'Affichage de l’équipe', type: 'select', options: [
        { value: 'members', label: 'Membres individuels' },
        { value: 'photo', label: 'Une seule photo d’équipe' },
      ], hint: 'Pour « une seule photo », téléversez-la dans Galeries → Photo équipe.' },
    ],
  },
  {
    title: 'Réseaux sociaux & Google Business',
    fields: [
      { name: 'facebook_url', label: 'Facebook (Wiki Tours)' },
      { name: 'instagram_url', label: 'Instagram (Wiki Tours)' },
      { name: 'tiktok_url', label: 'TikTok (Wiki Tours)' },
      { name: 'youtube_url', label: 'YouTube (Wiki Tours)' },
      { name: 'babmakka_facebook_url', label: 'Facebook (Bab Makka)' },
      { name: 'babmakka_instagram_url', label: 'Instagram (Bab Makka)' },
      { name: 'babmakka_tiktok_url', label: 'TikTok (Bab Makka)' },
      { name: 'babmakka_youtube_url', label: 'YouTube (Bab Makka)' },
      { name: 'gbp_url', label: 'Fiche Google Business (URL de la fiche / Maps)', hint: 'Utilisée dans le schéma (hasMap + sameAs) — copier l’URL publique de la fiche.' },
      { name: 'gbp_review_url', label: 'Lien avis Google' },
      { name: 'gbp_rating', label: 'Note Google (0–5)', type: 'number', step: '0.1' },
      { name: 'gbp_review_count', label: 'Nombre d’avis Google', type: 'number' },
      { name: 'community_count', label: 'Taille de la communauté (ex. 925K)' },
    ],
  },
  {
    title: 'Tracking & pixels',
    tracking: true,
    fields: [
      { name: 'ga4_id', label: 'GA4 Measurement ID', platform: 'GA4', testUrl: 'https://analytics.google.com/analytics/web/#/debugview' },
      { name: 'google_ads_id', label: 'Google Ads ID', platform: 'Google Ads' },
      { name: 'google_ads_lead_label', label: 'Google Ads — label conversion lead', platform: 'Google Ads' },
      { name: 'meta_pixel_id', label: 'Meta Pixel ID', platform: 'Meta', testUrl: 'https://business.facebook.com/events_manager2/list' },
      { name: 'meta_capi_token', label: 'Meta CAPI token (serveur)', platform: 'Meta', secret: true },
      { name: 'tiktok_pixel_id', label: 'TikTok Pixel ID', platform: 'TikTok' },
      { name: 'tiktok_events_token', label: 'TikTok Events token (serveur)', platform: 'TikTok', secret: true },
    ],
  },
  {
    title: 'SEO & confidentialité',
    fields: [
      { name: 'verification_metas', label: 'Balises de vérification (une par ligne)', type: 'textarea', rows: 4 },
      { name: 'indexnow_key', label: 'Clé IndexNow' },
      { name: 'consent_banner_enabled', label: 'Bannière de consentement activée', type: 'bool' },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);

/**
 * Fields that carry real SEO/E-E-A-T weight. Leaving them empty silently hides
 * the licence card on /agrement and strips address / rating / verification from
 * the schema.org output — invisible from the site itself, so surface it here.
 */
const CRITICAL = [
  { name: 'license_number', label: 'N° de licence', why: 'la page /agrément reste vide et le schema Organization perd sa crédibilité' },
  { name: 'address_fr', label: 'Adresse (FR)', why: 'le schema LocalBusiness / Organization sort sans adresse (SEO local)' },
  { name: 'gbp_rating', label: 'Note Google', why: 'aucune étoile ne peut apparaître dans les résultats de recherche' },
  { name: 'gbp_review_count', label: 'Nombre d’avis Google', why: 'aucune étoile ne peut apparaître dans les résultats de recherche' },
  { name: 'verification_metas', label: 'Balises de vérification', why: 'Search Console / Bing ne peuvent pas valider le site' },
];

export default function SettingsForm({ settings }) {
  const router = useRouter();
  const initial = useMemo(() => {
    const v = {};
    for (const f of ALL_FIELDS) {
      v[f.name] = settings?.[f.name] ?? (f.type === 'bool' ? true : '');
    }
    return v;
  }, [settings]);

  const [values, setValues] = useState(initial);
  const [state, setState] = useState('idle');
  const [error, setError] = useState(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  function set(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
    setState('idle');
  }

  async function save() {
    setState('saving');
    setError(null);
    const result = await saveSettings(values);
    if (result.ok) {
      setState('saved');
      router.refresh();
    } else {
      setState('idle');
      setError(result.error);
    }
  }

  const isEmpty = (name) => {
    const v = values[name];
    return v === '' || v === null || v === undefined;
  };
  const missing = CRITICAL.filter((f) => isEmpty(f.name));
  // sameAs (social profile links) is how AI engines resolve the site, GBP and
  // socials into ONE entity. Zero links = the brand can't be confidently cited.
  const socialFields = ['facebook_url', 'instagram_url', 'tiktok_url', 'youtube_url'];
  const noSocials = socialFields.every(isEmpty);

  return (
    <div className="flex flex-col gap-6 pb-24">
      {missing.length ? (
        <section className="rounded-card border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-sm font-bold text-amber-900">
            {missing.length} information{missing.length > 1 ? 's' : ''} manquante
            {missing.length > 1 ? 's' : ''} — impact SEO direct
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {missing.map((f) => (
              <li key={f.name} className="text-xs leading-relaxed text-amber-900/80">
                <span className="font-semibold">{f.label}</span> — sans ça, {f.why}.
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {noSocials ? (
        <section className="rounded-card border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-sm font-bold text-amber-900">Aucun réseau social renseigné — visibilité IA réduite</h2>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
            Les liens Facebook / Instagram / TikTok / YouTube alimentent le champ <code>sameAs</code> du
            schema. C’est le principal signal qui permet à ChatGPT, Perplexity et Google de reconnaître
            « {'Bab Makka by Wiki Tours International'} » comme une entité fiable et de la citer. Ajoutez-en au moins un.
          </p>
        </section>
      ) : null}

      {SECTIONS.map((section) => (
        <section key={section.title} className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
          <h2 className="mb-4 text-sm font-bold">{section.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((f) => (
              <div key={f.name} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  <span className="flex items-center gap-2">
                    {f.label}
                    {section.tracking ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          values[f.name]
                            ? 'bg-green-100 text-green-700'
                            : 'bg-bm-black/5 text-bm-black/40'
                        }`}
                      >
                        {values[f.name] ? 'Configuré — à tester' : 'Non configuré'}
                      </span>
                    ) : null}
                    {f.testUrl && values[f.name] ? (
                      <a
                        href={f.testUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-wiki-blue hover:underline"
                      >
                        Tester ↗
                      </a>
                    ) : null}
                  </span>
                  {f.type === 'bool' ? (
                    <input
                      type="checkbox"
                      checked={!!values[f.name]}
                      onChange={(e) => set(f.name, e.target.checked)}
                      className="size-4 accent-wiki-blue"
                    />
                  ) : f.type === 'textarea' ? (
                    <textarea
                      dir={f.dir}
                      rows={f.rows ?? 2}
                      value={values[f.name] ?? ''}
                      onChange={(e) => set(f.name, e.target.value)}
                      className={INPUT}
                    />
                  ) : f.type === 'select' ? (
                    <select value={values[f.name] ?? 'fr'} onChange={(e) => set(f.name, e.target.value)} className={INPUT}>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.secret ? 'password' : f.type === 'number' ? 'number' : 'text'}
                      step={f.step}
                      value={values[f.name] ?? ''}
                      onChange={(e) => set(f.name, e.target.value)}
                      onWheel={f.type === 'number' ? (e) => e.currentTarget.blur() : undefined}
                      className={INPUT}
                    />
                  )}
                  {f.hint ? <span className="text-xs font-normal text-bm-black/40">{f.hint}</span> : null}
                </label>
              </div>
            ))}
          </div>
        </section>
      ))}

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-bm-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
          <button
            type="button"
            onClick={save}
            disabled={state === 'saving' || !dirty}
            className="rounded-ctrl bg-wiki-blue px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90 disabled:opacity-60"
          >
            {state === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <span className="text-xs text-bm-black/40">
            {dirty ? 'Modifications non enregistrées' : state === 'saved' ? 'Enregistré ✓' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

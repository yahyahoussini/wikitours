'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveOfferTiers } from '@/app/admin/entity-actions';

const TIER_LABELS = [
  { value: 'economique', label: 'Économique' },
  { value: 'confort', label: 'Confort' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
];

const ROOM_KEYS = [
  { key: 'price_double', label: 'Double' },
  { key: 'price_triple', label: 'Triple' },
  { key: 'price_quad', label: 'Quadruple' },
  { key: 'price_quint', label: 'Quintuple' },
];

function emptyTier() {
  return {
    id: null,
    label: '',
    sort_order: 0,
    hotel_makkah_id: '',
    hotel_madinah_id: '',
    nights_makkah: '',
    nights_madinah: '',
    distance_to_haram_m: '',
    breakfast_included: false,
    price_double: '',
    price_triple: '',
    price_quad: '',
    price_quint: '',
    is_published: true,
  };
}

export default function OfferTierManager({ offerId, tiers: initialTiers, hotelOptions }) {
  const router = useRouter();
  const [tiers, setTiers] = useState(
    initialTiers.length > 0
      ? initialTiers.map(normalizeTier)
      : [emptyTier()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dirty, setDirty] = useState(false);

  // type="number" inputs change value on wheel-scroll while focused — that's
  // how prices silently drifted by ±1/±2 when admins scrolled the page.
  const blurOnWheel = (e) => e.currentTarget.blur();

  function normalizeTier(t) {
    return {
      id: t.id ?? null,
      label: t.label ?? '',
      sort_order: t.sort_order ?? 0,
      hotel_makkah_id: t.hotel_makkah_id ?? '',
      hotel_madinah_id: t.hotel_madinah_id ?? '',
      nights_makkah: t.nights_makkah ?? '',
      nights_madinah: t.nights_madinah ?? '',
      distance_to_haram_m: t.distance_to_haram_m ?? '',
      breakfast_included: t.breakfast_included ?? false,
      price_double: t.price_double ?? '',
      price_triple: t.price_triple ?? '',
      price_quad: t.price_quad ?? '',
      price_quint: t.price_quint ?? '',
      is_published: t.is_published ?? true,
    };
  }

  function updateTier(index, field, value) {
    setTiers((prev) => {
      const next = prev.map((t, i) => (i === index ? { ...t, [field]: value } : t));
      return next;
    });
    setDirty(true);
    setError(null);
    setSuccess(null);
  }

  function addTier() {
    const usedLabels = new Set(tiers.map((t) => t.label).filter(Boolean));
    const nextLabel = TIER_LABELS.find((tl) => !usedLabels.has(tl.value));
    const newTier = { ...emptyTier(), label: nextLabel?.value ?? '', sort_order: tiers.length };
    setTiers((prev) => [...prev, newTier]);
  }

  function removeTier(index) {
    if (tiers.length <= 1) return;
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = tiers.map((t, i) => ({
      id: t.id,
      label: t.label,
      sort_order: i,
      hotel_makkah_id: t.hotel_makkah_id || null,
      hotel_madinah_id: t.hotel_madinah_id || null,
      nights_makkah: t.nights_makkah !== '' ? Number(t.nights_makkah) : null,
      nights_madinah: t.nights_madinah !== '' ? Number(t.nights_madinah) : null,
      distance_to_haram_m: t.distance_to_haram_m !== '' ? Number(t.distance_to_haram_m) : null,
      breakfast_included: t.breakfast_included,
      price_double: t.price_double !== '' ? Number(t.price_double) : null,
      price_triple: t.price_triple !== '' ? Number(t.price_triple) : null,
      price_quad: t.price_quad !== '' ? Number(t.price_quad) : null,
      price_quint: t.price_quint !== '' ? Number(t.price_quint) : null,
      is_published: t.is_published,
    }));

    const result = await saveOfferTiers(offerId, payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Re-sync with what the DB stored — without this, freshly inserted tiers
    // kept id:null locally and the NEXT save re-inserted them (23505 abort).
    if (result.tiers) {
      setTiers(result.tiers.length ? result.tiers.map(normalizeTier) : [emptyTier()]);
    }
    setDirty(false);
    setSuccess('Gammes enregistrées');
    router.refresh();
  }

  const useableLabels = TIER_LABELS.filter((tl) => !tiers.some((t) => t.label === tl.value) || tiers[tiers.findIndex((t) => t.label === tl.value)]?.label === tl.value);

  return (
    <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold">Gammes (tiers)</h2>
        <button
          type="button"
          onClick={addTier}
          disabled={tiers.length >= 4}
          className="rounded-ctrl bg-bm-gold px-3 py-1.5 text-xs font-semibold text-bm-black transition hover:bg-bm-gold-light disabled:opacity-40"
        >
          + Ajouter une gamme
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {tiers.map((tier, i) => (
          <div
            key={i}
            className="rounded-ctrl border border-bm-black/10 bg-bm-black/5 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-bm-black/70">Gamme {i + 1}</span>
              {tiers.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeTier(i)}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Supprimer
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TierField label="Gamme">
                <select
                  value={tier.label}
                  onChange={(e) => updateTier(i, 'label', e.target.value)}
                  className="w-full rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue"
                >
                  <option value="">—</option>
                  {TIER_LABELS.map((tl) => (
                    <option
                      key={tl.value}
                      value={tl.value}
                      disabled={tiers.some((t, ti) => ti !== i && t.label === tl.value)}
                    >
                      {tl.label}
                    </option>
                  ))}
                </select>
              </TierField>

              <TierField label="Hôtel La Mecque">
                <select
                  value={tier.hotel_makkah_id}
                  onChange={(e) => updateTier(i, 'hotel_makkah_id', e.target.value)}
                  className="w-full rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue"
                >
                  <option value="">—</option>
                  {hotelOptions.map((ho) => (
                    <option key={ho.value} value={ho.value}>{ho.label}</option>
                  ))}
                </select>
              </TierField>

              <TierField label="Hôtel Médine">
                <select
                  value={tier.hotel_madinah_id}
                  onChange={(e) => updateTier(i, 'hotel_madinah_id', e.target.value)}
                  className="w-full rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue"
                >
                  <option value="">—</option>
                  {hotelOptions.map((ho) => (
                    <option key={ho.value} value={ho.value}>{ho.label}</option>
                  ))}
                </select>
              </TierField>

              <TierField label="Nuits à La Mecque">
                <input type="number" value={tier.nights_makkah} onChange={(e) => updateTier(i, 'nights_makkah', e.target.value)} onWheel={blurOnWheel} placeholder="0" min={0} className="w-full rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue" />
              </TierField>

              <TierField label="Nuits à Médine">
                <input type="number" value={tier.nights_madinah} onChange={(e) => updateTier(i, 'nights_madinah', e.target.value)} onWheel={blurOnWheel} placeholder="0" min={0} className="w-full rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue" />
              </TierField>

              <TierField label="Distance au Haram (m)">
                <input type="number" value={tier.distance_to_haram_m} onChange={(e) => updateTier(i, 'distance_to_haram_m', e.target.value)} onWheel={blurOnWheel} placeholder="m" min={0} className="w-full rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue" />
              </TierField>

              <TierField label="Petit-déjeuner">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={tier.breakfast_included} onChange={(e) => updateTier(i, 'breakfast_included', e.target.checked)} className="size-4 accent-wiki-blue" />
                  Inclus
                </label>
              </TierField>

              {/* Boolean: published */}
              <TierField label="Publié">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tier.is_published}
                    onChange={(e) => updateTier(i, 'is_published', e.target.checked)}
                    className="size-4 accent-wiki-blue"
                  />
                  Actif
                </label>
              </TierField>

              {/* Price fields */}
              {ROOM_KEYS.map((rk) => (
                <TierField key={rk.key} label={`Prix ${rk.label} (MAD/pers)`}>
                  <input
                    type="number"
                    value={tier[rk.key]}
                    onChange={(e) => updateTier(i, rk.key, e.target.value)}
                    onWheel={blurOnWheel}
                    placeholder="0"
                    min={0}
                    className="w-full rounded-ctrl border border-bm-black/15 bg-white px-3 py-2 text-sm shadow-hairline outline-none focus:border-wiki-blue"
                  />
                </TierField>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-ctrl bg-wiki-blue px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les gammes'}
        </button>
        {dirty && !saving ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Modifications non enregistrées — le bouton « Enregistrer » de l’offre ne sauvegarde pas les gammes
          </span>
        ) : null}
        {success ? <span className="text-xs font-medium text-green-700">{success}</span> : null}
        {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
      </div>
    </section>
  );
}

function TierField({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-bm-black/70">
      {label}
      {children}
    </label>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateLeadStatus, addLeadNote, updateLeadFields, logReviewRequest } from '@/app/admin/entity-actions';
import { LEAD_STATUSES } from '@/lib/admin/lead-statuses';
import { phoneKey } from '@/lib/crm/client-key';

const KIND_LABEL = {
  note: 'Note',
  status_change: 'Changement de statut',
  whatsapp: 'WhatsApp',
  call: 'Appel',
  review_request: 'Demande d’avis',
};

const EVENT_LABEL = {
  pageview: 'Page vue',
  offer_view: 'Offre consultée',
  form_start: 'Formulaire commencé',
  form_submit: 'Demande envoyée',
  whatsapp_click: 'Clic WhatsApp',
  cta_click: 'Clic CTA',
};

const INPUT =
  'rounded-ctrl border border-bm-black/15 bg-white px-3 py-1.5 text-sm shadow-hairline outline-none focus:border-wiki-blue';

function waTemplate(lead) {
  const digits = String(lead.phone ?? '').replace(/\D/g, '');
  const text =
    lead.locale === 'ar'
      ? `السلام عليكم ${lead.full_name}، معكم ويكي تورز بخصوص طلبكم${lead.offer_title ? ` « ${lead.offer_title} »` : ''}.`
      : `Bonjour ${lead.full_name}, c'est Wiki Tours au sujet de votre demande${lead.offer_title ? ` « ${lead.offer_title} »` : ''}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export default function LeadDetail({ lead, activities, journey, gbpReviewUrl }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [value, setValue] = useState(lead.value_mad ?? '');
  const [assigned, setAssigned] = useState(lead.assigned_to ?? '');
  const [busy, setBusy] = useState(false);
  const [savedFields, setSavedFields] = useState(false);

  const roomLabels = { double: 'Double', triple: 'Triple', quad: 'Quadruple', quint: 'Quintuple' };
  const facts = [
    ['Ville', lead.city],
    ['Offre', lead.offer_title],
    ['Chambre souhaitée', roomLabels[lead.room_type]],
    ['Commentaire client', lead.message],
    ['Langue', lead.locale],
    ['Créé le', new Date(lead.created_at).toLocaleString('fr-FR')],
  ].filter(([, v]) => v);

  async function onStatus(status) {
    setBusy(true);
    await updateLeadStatus({ id: lead.id, status });
    setBusy(false);
    router.refresh();
  }

  async function saveFields() {
    setBusy(true);
    const result = await updateLeadFields({ id: lead.id, value_mad: value, assigned_to: assigned });
    setBusy(false);
    setSavedFields(result.ok);
    router.refresh();
  }

  async function onAddNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    await addLeadNote({ leadId: lead.id, body: note.trim() });
    setBusy(false);
    setNote('');
    router.refresh();
  }

  async function onReviewRequest() {
    window.open(gbpReviewUrl, '_blank', 'noopener');
    await logReviewRequest(lead.id);
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Contact + qualification */}
      <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={lead.status}
            disabled={busy}
            onChange={(e) => onStatus(e.target.value)}
            className={INPUT}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <a
            href={waTemplate(lead)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-ctrl bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            WhatsApp
          </a>
          <a
            href={`tel:${lead.phone}`}
            className="rounded-ctrl bg-bm-black px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-bm-black-soft"
          >
            Appeler {lead.phone}
          </a>
          <Link
            href={`/admin/crm/client/${phoneKey(lead.phone)}`}
            className="rounded-ctrl bg-bm-black/5 px-3 py-1.5 text-sm font-semibold transition hover:bg-bm-black/10"
          >
            Profil client
          </Link>
          {lead.status === 'traveled' && gbpReviewUrl ? (
            <button
              type="button"
              onClick={onReviewRequest}
              className="rounded-ctrl bg-bm-gold px-3 py-1.5 text-sm font-semibold text-bm-black transition hover:bg-bm-gold-light"
            >
              Demander un avis ★
            </button>
          ) : null}
        </div>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {facts.map(([label, v]) => (
            <div key={label} className="contents">
              <dt className="text-bm-black/40">{label}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-bm-black/5 pt-4">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Valeur (MAD)
            <input type="number" min="0" value={value} onChange={(e) => { setValue(e.target.value); setSavedFields(false); }} onWheel={(e) => e.currentTarget.blur()} className={`${INPUT} w-32`} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Assigné à
            <input value={assigned} onChange={(e) => { setAssigned(e.target.value); setSavedFields(false); }} className={`${INPUT} w-40`} />
          </label>
          <button
            type="button"
            onClick={saveFields}
            disabled={busy}
            className="rounded-ctrl bg-wiki-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-wiki-blue/90 disabled:opacity-60"
          >
            Enregistrer
          </button>
          {savedFields ? <span className="pb-2 text-xs text-green-700">✓</span> : null}
        </div>
      </section>

      {/* Journey */}
      <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline">
        <h2 className="text-sm font-bold">Parcours du visiteur</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-bm-black/40">Source</dt>
          <dd className="font-medium">
            {[lead.utm_source, lead.utm_medium].filter(Boolean).join(' / ') ||
              journey?.sessions?.[0]?.referrer ||
              'Direct / inconnu'}
            {lead.utm_campaign ? ` · ${lead.utm_campaign}` : ''}
          </dd>
          <dt className="text-bm-black/40">Localisation</dt>
          <dd className="font-medium">{[lead.geo_city, lead.region, lead.country].filter(Boolean).join(', ') || '—'}</dd>
          <dt className="text-bm-black/40">Appareil</dt>
          <dd className="font-medium">{lead.device ?? '—'}</dd>
          {lead.gclid ? (<><dt className="text-bm-black/40">gclid</dt><dd className="truncate font-mono text-xs">{lead.gclid}</dd></>) : null}
          {lead.fbclid ? (<><dt className="text-bm-black/40">fbclid</dt><dd className="truncate font-mono text-xs">{lead.fbclid}</dd></>) : null}
        </dl>

        {journey?.events?.length ? (
          <ol className="mt-4 max-h-80 space-y-1.5 overflow-y-auto border-s-2 border-wiki-blue/20 ps-3 text-sm">
            {journey.events.map((e) => (
              <li key={e.id}>
                <span className="me-2 tabular-nums text-xs text-bm-black/40">
                  {new Date(e.ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-medium">{EVENT_LABEL[e.type] ?? e.type}</span>
                <span className="text-bm-black/50"> — {e.offer_title ?? e.path}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-bm-black/40">
            Aucun parcours enregistré {lead.visitor_id ? 'pour ce visiteur.' : '(lead sans cookie visiteur).'}
          </p>
        )}
      </section>

      {/* Activity */}
      <section className="rounded-card border border-bm-black/10 bg-white p-5 shadow-hairline lg:col-span-2">
        <h2 className="text-sm font-bold">Activité</h2>
        <form onSubmit={onAddNote} className="mt-3 flex max-w-xl gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ajouter une note…"
            className={`${INPUT} flex-1`}
          />
          <button
            type="submit"
            disabled={busy || !note.trim()}
            className="rounded-ctrl bg-wiki-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-wiki-blue/90 disabled:opacity-60"
          >
            Ajouter
          </button>
        </form>
        <ul className="mt-4 space-y-3">
          {activities.length === 0 ? (
            <li className="text-sm text-bm-black/40">Aucune activité.</li>
          ) : (
            activities.map((a) => (
              <li key={a.id} className="border-s-2 border-wiki-blue/30 ps-3 text-sm">
                <p className="text-xs text-bm-black/40">
                  {KIND_LABEL[a.kind] ?? a.kind} · {new Date(a.created_at).toLocaleString('fr-FR')}
                </p>
                <p className="mt-0.5">{a.body}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateLeadStatus } from '@/app/admin/entity-actions';

export const LEAD_STATUSES = [
  { value: 'new', label: 'Nouveau' },
  { value: 'contacted', label: 'Contacté' },
  { value: 'qualified', label: 'Qualifié' },
  { value: 'paid_deposit', label: 'Acompte payé' },
  { value: 'traveled', label: 'A voyagé' },
  { value: 'lost', label: 'Perdu' },
];

export default function LeadRow({ lead, staleCutoffIso }) {
  const router = useRouter();
  const isStale = lead.status === 'new' && lead.created_at < staleCutoffIso;

  async function onStatus(status) {
    await updateLeadStatus({ id: lead.id, status });
    router.refresh();
  }

  return (
    <tr className={`border-b border-bm-black/5 text-sm last:border-0 ${isStale ? 'bg-red-50' : ''}`}>
      <td className="px-4 py-2.5">
        <Link href={`/admin/crm/${lead.id}`} className="font-medium hover:text-wiki-blue">
          {lead.full_name}
        </Link>
        {isStale ? (
          <span className="ms-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            &gt; 48 h
          </span>
        ) : null}
      </td>
      <td className="px-4 py-2.5 tabular-nums">
        <a href={`tel:${lead.phone}`} className="hover:text-wiki-blue">{lead.phone}</a>
      </td>
      <td className="px-4 py-2.5 text-bm-black/60">{lead.city ?? '—'}</td>
      <td className="max-w-52 truncate px-4 py-2.5 text-bm-black/60">{lead.offer_title ?? '—'}</td>
      <td className="px-4 py-2.5 text-bm-black/50">
        {new Date(lead.created_at).toLocaleDateString('fr-FR')}
      </td>
      <td className="px-4 py-2.5">
        <select
          value={lead.status}
          onChange={(e) => onStatus(e.target.value)}
          className="rounded-ctrl border border-bm-black/15 bg-white px-2 py-1 text-xs outline-none focus:border-wiki-blue"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </td>
    </tr>
  );
}

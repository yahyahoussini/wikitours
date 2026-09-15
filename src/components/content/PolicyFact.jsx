import { getDictionary, pickLang } from '@/lib/i18n';
import { getPolicies } from '@/lib/data/content';

/**
 * <PolicyFact key="deposit|payment|passport_validity|visa_included|children" />
 * — one policy sentence as the agency states it TODAY, read from
 * public.policies (migration 026, admin-editable) at request time. Until the
 * table exists the dictionary carries the same sentences (copied verbatim
 * from the published FAQ). Never in prose: a policy that changes must change
 * in every article at once.
 */
const FALLBACK_KEYS = { deposit: 'policyDeposit', payment: 'policyPayment', passport_validity: 'policyPassport', visa_included: 'policyVisa', children: 'policyChildren' };

export default async function PolicyFact({ key: policyKey, locale }) {
  const t = getDictionary(locale);
  const rows = await getPolicies();
  const row = rows.find((r) => r.key === policyKey && r.is_published !== false);
  const text = row ? pickLang(row, 'text', locale) : t.content[FALLBACK_KEYS[policyKey]] ?? null;
  if (!text) return null;
  return (
    <aside className="rounded-card border border-wiki-blue/20 bg-wiki-blue/5 p-5" data-policy-fact={policyKey}>
      <p className="text-xs font-semibold uppercase tracking-wide text-wiki-blue">{t.content.policyTitle}</p>
      <p className="mt-1 leading-relaxed text-bm-black/85">{text}</p>
    </aside>
  );
}

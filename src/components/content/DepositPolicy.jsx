import { getDictionary } from '@/lib/i18n';

/**
 * <DepositPolicy /> — how a booking is paid, rendered from the ONE place the
 * site already states it (t.offer.depositLine, also on every departure page)
 * plus the no-online-payment clause. Never in prose: the terms can change
 * and the change must reach every article at once. A settings-backed
 * version (deposit_policy_{fr,ar,en}) is a one-column migration when the
 * owner wants to edit it from the admin.
 */
export default function DepositPolicy({ locale }) {
  const t = getDictionary(locale);
  return (
    <aside className="rounded-card border border-wiki-blue/20 bg-wiki-blue/5 p-5" data-deposit-policy>
      <p className="font-bold text-bm-black">{t.content.depositTitle}</p>
      <ul className="mt-2 list-disc space-y-1 ps-5 leading-relaxed text-bm-black/80">
        <li>{t.meta.trustNoPayment}</li>
        <li>{t.offer.depositLine}</li>
      </ul>
    </aside>
  );
}

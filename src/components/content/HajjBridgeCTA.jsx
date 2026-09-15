import HajjBridge from '@/components/site/HajjBridge';

/**
 * <HajjBridgeCTA /> — « Pas retenu au tirage au sort du Hajj ? » / « لم يحالفك
 * الحظ في قرعة الحج؟ », the Hajj → Omra bridge as a placeholder tag, so a
 * Hajj-cluster post can place it where the reading calls for it. Same
 * component the four lottery articles already carry at their end
 * (src/components/site/HajjBridge.jsx): the number of open departures and the
 * lowest price are live, the button goes to the Omra hub.
 */
export default function HajjBridgeCTA({ locale }) {
  return <HajjBridge locale={locale} />;
}

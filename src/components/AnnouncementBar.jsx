import { supabasePublic } from '@/lib/supabase/public';
import { pickLang } from '@/lib/i18n';
import AnnouncementBarClient from '@/components/AnnouncementBarClient';

/**
 * One active announcement renders above the public header (RLS already
 * limits anon reads to active rows inside their schedule window). Dismissal
 * is a client-side cookie so pages stay fully static/ISR.
 */
export default async function AnnouncementBar({ locale }) {
  try {
    const supabase = supabasePublic();
    if (!supabase) return null;
    const { data } = await supabase
      .from('announcements')
      .select('id, text_fr, text_ar, text_en, link, variant')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const text = pickLang(data, 'text', locale);
    if (!text) return null;
    return (
      <AnnouncementBarClient id={data.id} text={text} link={data.link} variant={data.variant} />
    );
  } catch {
    return null;
  }
}

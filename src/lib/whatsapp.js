/** Builds a wa.me link from a stored number like "+212660655655". */
export function waLink(number, text) {
  if (!number) return null;
  const digits = String(number).replace(/\D/g, '');
  if (!digits) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}

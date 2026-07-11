/**
 * Structured data (LAWS §5). Renders in the served HTML; "<" is escaped so
 * DB-sourced strings can never break out of the script element.
 */
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

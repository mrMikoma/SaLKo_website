// schema.org structured data for search engines. "<" is escaped so that text
// in the data can't close the script tag (the Next.js JSON-LD guide).
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

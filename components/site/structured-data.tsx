import type { JsonLd } from '@/utils/site/structured-data'

export function StructuredData({ data }: { data: JsonLd | JsonLd[] }) {
  const items = Array.isArray(data) ? data : [data]

  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  )
}

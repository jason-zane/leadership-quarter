import type { MetadataRoute } from 'next'
import { servicesContent } from '@/utils/brand/services-content'
import { getPublicBaseUrl } from '@/utils/hosts'

function toEntry(baseUrl: string, path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']) {
  return {
    url: new URL(path, `${baseUrl}/`).toString(),
    lastModified: new Date(),
    changeFrequency,
    priority,
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicBaseUrl()

  return [
    toEntry(baseUrl, '/', 1, 'weekly'),
    toEntry(baseUrl, '/about', 0.7, 'monthly'),
    toEntry(baseUrl, '/capabilities', 0.9, 'weekly'),
    ...servicesContent.map((service) => toEntry(baseUrl, `/capabilities/${service.slug}`, 0.8, 'weekly')),
    toEntry(baseUrl, '/framework', 0.75, 'monthly'),
    toEntry(baseUrl, '/framework/lq8', 0.7, 'monthly'),
    toEntry(baseUrl, '/framework/lq-ai-readiness', 0.7, 'monthly'),
    toEntry(baseUrl, '/work-with-us', 0.8, 'monthly'),
  ]
}

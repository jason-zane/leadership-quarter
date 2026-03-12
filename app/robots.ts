import type { MetadataRoute } from 'next'
import { getPublicBaseUrl } from '@/utils/hosts'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/capabilities',
          '/framework',
          '/work-with-us',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/api/',
          '/dashboard/',
          '/portal/',
          '/client-login',
          '/login',
          '/signup',
          '/reset-password',
          '/set-password',
          '/document/',
          '/assess/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}

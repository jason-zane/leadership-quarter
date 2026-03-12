import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const iconVersion = '20260312c'

  return {
    name: 'Leadership Quarter',
    short_name: 'LQ',
    description:
      'Leadership Quarter provides executive search, leadership assessment, succession strategy, and AI readiness advisory.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f3ea',
    theme_color: '#102033',
    icons: [
      {
        src: `/icon-192.png?v=${iconVersion}`,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: `/icon-512.png?v=${iconVersion}`,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}

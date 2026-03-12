import type { Metadata } from 'next'

const SITE_NAME = 'Leadership Quarter'
const SOCIAL_IMAGE_PATH = '/opengraph-image'
const DEFAULT_KEYWORDS = [
  'executive search',
  'leadership assessment',
  'succession strategy',
  'AI readiness',
  'Sydney executive search',
  'Australia leadership consulting',
  'Leadership Quarter',
]

type BuildPublicMetadataInput = {
  title: string
  description: string
  path: string
  noIndex?: boolean
  keywords?: string[]
  openGraphTitle?: string
  openGraphDescription?: string
  openGraphAlt?: string
}

export function buildPublicMetadata({
  title,
  description,
  path,
  noIndex = false,
  keywords,
  openGraphTitle,
  openGraphDescription,
  openGraphAlt = SITE_NAME,
}: BuildPublicMetadataInput): Metadata {
  const resolvedKeywords = keywords?.length ? keywords : DEFAULT_KEYWORDS

  return {
    title,
    description,
    keywords: resolvedKeywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: openGraphTitle ?? title,
      description: openGraphDescription ?? description,
      type: 'website',
      locale: 'en_AU',
      siteName: SITE_NAME,
      url: path,
      images: [
        {
          url: SOCIAL_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: openGraphAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: openGraphTitle ?? title,
      description: openGraphDescription ?? description,
      images: [SOCIAL_IMAGE_PATH],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  }
}

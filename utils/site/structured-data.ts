import { CONTACT_EMAIL, CONTACT_LOCATION, CONTACT_PHONE } from '@/utils/brand/contact'
import type { ServiceContent } from '@/utils/brand/services-content'
import { getPublicBaseUrl } from '@/utils/hosts'

const SITE_NAME = 'Leadership Quarter'
const SITE_DESCRIPTION =
  'Leadership Quarter helps organisations make sharper leadership decisions through executive search, leadership assessment, succession strategy, and AI readiness.'
const ORGANIZATION_ID = '#organization'
const WEBSITE_ID = '#website'
const LOGO_PATH = '/icon-512.png'

export type JsonLd = Record<string, unknown>

type BreadcrumbItem = {
  name: string
  path: string
}

function getBaseUrl() {
  return getPublicBaseUrl()
}

export function toAbsoluteSiteUrl(path: string) {
  return new URL(path, `${getBaseUrl()}/`).toString()
}

export function getOrganizationSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': toAbsoluteSiteUrl(`/${ORGANIZATION_ID}`),
    name: SITE_NAME,
    url: toAbsoluteSiteUrl('/'),
    description: SITE_DESCRIPTION,
    logo: toAbsoluteSiteUrl(LOGO_PATH),
    email: CONTACT_EMAIL,
    telephone: CONTACT_PHONE,
    areaServed: 'AU',
    address: {
      '@type': 'PostalAddress',
      addressLocality: CONTACT_LOCATION.replace(', Australia', ''),
      addressCountry: 'AU',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: CONTACT_EMAIL,
        telephone: CONTACT_PHONE,
        areaServed: 'AU',
        availableLanguage: ['en-AU', 'en'],
      },
    ],
  }
}

export function getWebsiteSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': toAbsoluteSiteUrl(`/${WEBSITE_ID}`),
    url: toAbsoluteSiteUrl('/'),
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: 'en-AU',
    publisher: {
      '@id': toAbsoluteSiteUrl(`/${ORGANIZATION_ID}`),
    },
  }
}

export function getBreadcrumbSchema(items: BreadcrumbItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: toAbsoluteSiteUrl(item.path),
    })),
  }
}

export function getServiceSchema(input: {
  service: ServiceContent
  path: string
}): JsonLd {
  const { service, path } = input

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': toAbsoluteSiteUrl(`${path}#service`),
    name: `${service.name} | ${SITE_NAME}`,
    serviceType: service.name,
    description: service.description,
    url: toAbsoluteSiteUrl(path),
    areaServed: 'AU',
    provider: {
      '@id': toAbsoluteSiteUrl(`/${ORGANIZATION_ID}`),
    },
    audience: service.audience.map((audienceType) => ({
      '@type': 'Audience',
      audienceType,
    })),
  }
}

export function getPersonSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': toAbsoluteSiteUrl('/about#jason-hunt'),
    name: 'Jason Hunt',
    jobTitle: 'Partner',
    image: toAbsoluteSiteUrl('/images/DSC_9980_(2).png'),
    description:
      'Jason Hunt is the Partner at Leadership Quarter, specialising in executive search, leadership assessment, and senior talent selection.',
    worksFor: {
      '@id': toAbsoluteSiteUrl(`/${ORGANIZATION_ID}`),
    },
    url: toAbsoluteSiteUrl('/about'),
  }
}

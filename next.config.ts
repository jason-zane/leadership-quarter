import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/services',
        destination: '/capabilities',
        permanent: true,
      },
      {
        source: '/services/:slug',
        destination: '/capabilities/:slug',
        permanent: true,
      },
      {
        source: '/retreats',
        destination: '/capabilities',
        permanent: true,
      },
      {
        source: '/retreats/:slug',
        destination: '/capabilities',
        permanent: true,
      },
      {
        source: '/experience',
        destination: '/capabilities',
        permanent: true,
      },
      {
        source: '/faq',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/terms-and-conditions',
        destination: '/contact',
        permanent: true,
      },
    ]
  },
}

export default nextConfig

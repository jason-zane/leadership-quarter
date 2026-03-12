import type { Metadata } from 'next'
import Script from 'next/script'
import { headers } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from 'sonner'
import { getPublicBaseUrl } from '@/utils/hosts'
import './globals.css'

const siteDescription =
  'Leadership Quarter helps organisations identify and assess leadership capability through executive search, leadership assessment, succession strategy, and AI readiness.'

export const metadata: Metadata = {
  metadataBase: new URL(getPublicBaseUrl()),
  applicationName: 'Leadership Quarter',
  title: {
    default: 'Leadership Quarter',
    template: '%s | Leadership Quarter',
  },
  description: siteDescription,
  category: 'business',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Leadership Quarter',
    description: siteDescription,
    type: 'website',
    locale: 'en_AU',
    siteName: 'Leadership Quarter',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Leadership Quarter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leadership Quarter',
    description: siteDescription,
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400..800&family=Plus+Jakarta+Sans:wght@200..800&family=Space+Grotesk:wght@400..700&display=swap"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PNMPFPF37N"
          strategy="afterInteractive"
          nonce={nonce}
        />
        <Script id="ga-gtag" strategy="afterInteractive" nonce={nonce}>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PNMPFPF37N');
          `}
        </Script>
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Analytics />
        <SpeedInsights />
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  )
}

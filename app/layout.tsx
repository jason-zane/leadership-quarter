import type { Metadata } from 'next'
import Script from 'next/script'
import { headers } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Miles Between | Running Retreats',
  description:
    'Small-group running retreats with guided trail routes, thoughtful recovery time, and strong shared-table culture.',
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

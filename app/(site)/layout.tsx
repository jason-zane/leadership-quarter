import { Playfair_Display, Lora, Inter } from 'next/font/google'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${playfair.variable} ${lora.variable} ${inter.variable} site-theme-v1 font-lora`}>
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}

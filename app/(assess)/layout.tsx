import Link from 'next/link'
import { LQMark } from '@/components/site/lq-mark'

export default function AssessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-theme-v1 min-h-screen bg-[var(--site-bg)]">
      <header className="border-b border-[var(--site-border-soft)] bg-[var(--site-glass-bg-strong)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center px-6 py-4 md:px-12">
          <Link href="/" className="inline-flex items-center gap-3 text-[var(--site-text-primary)]">
            <LQMark className="shrink-0" />
            <span className="font-serif text-xl leading-none tracking-[-0.01em]">Leadership Quarter</span>
          </Link>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  )
}

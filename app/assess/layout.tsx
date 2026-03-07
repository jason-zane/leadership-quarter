import Link from 'next/link'
import { LQMark } from '@/components/site/lq-mark'

export default function UnifiedAssessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-theme-v1 assess-page">
      <header className="border-b border-[var(--site-border-soft)] bg-[rgba(255,255,255,0.72)] backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center px-4 py-3 md:px-6">
          <Link href="/" className="inline-flex items-center gap-2.5 text-[var(--site-text-primary)]">
            <LQMark className="shrink-0" />
            <span className="font-serif text-lg tracking-[-0.01em]">Leadership Quarter Assessments</span>
          </Link>
        </div>
      </header>
      <main className="assess-stage">{children}</main>
    </div>
  )
}

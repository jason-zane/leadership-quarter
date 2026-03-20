import { LQAssessHeader } from '@/components/assess/lq-assess-header'

export default function ContactGateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LQAssessHeader />
      <main className="assess-stage">{children}</main>
    </>
  )
}

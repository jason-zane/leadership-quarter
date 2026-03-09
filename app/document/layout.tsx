export default function DocumentLayout({ children }: { children: React.ReactNode }) {
  return <div className="site-theme-v1 min-h-screen bg-[var(--site-bg)]">{children}</div>
}

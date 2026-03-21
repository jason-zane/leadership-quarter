import { redirect } from 'next/navigation'

// Compatibility alias for old admin bookmarks. Canonical admin entrypoint is /dashboard.
export default function AdminPage() {
  redirect('/dashboard')
}

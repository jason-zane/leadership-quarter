import { redirect } from 'next/navigation'

// Temporary compatibility entrypoint. MFA flow currently resolves back to /dashboard.
export default function TotpEnrollPage() {
  redirect('/dashboard')
}

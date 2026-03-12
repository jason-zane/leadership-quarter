import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/utils/site/public-metadata'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Set password',
  description: 'Invite-based password setup for Leadership Quarter client access.',
  path: '/set-password',
  noIndex: true,
})

export default function SetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}

import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/utils/site/public-metadata'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Reset password',
  description: 'Password reset for Leadership Quarter client access.',
  path: '/reset-password',
  noIndex: true,
})

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}

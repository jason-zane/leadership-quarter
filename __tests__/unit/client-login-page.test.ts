import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/app/auth/actions', () => ({
  login: vi.fn(),
  requestPasswordReset: vi.fn(),
}))

import ClientLoginPage from '@/app/client-login/page'

describe('ClientLoginPage', () => {
  it('posts login and reset forms with the branded client surface metadata', async () => {
    const html = renderToStaticMarkup(
      await ClientLoginPage({
        searchParams: Promise.resolve({}),
      })
    )

    expect(html).toContain('name="surface" value="client"')
    expect(html).toContain('name="audience" value="portal"')
  })
})

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (process.env.NODE_ENV === 'production') {
      console.warn('CSP report:', JSON.stringify(body))
    }
  } catch {
    // ignore malformed reports
  }

  return NextResponse.json({ ok: true })
}

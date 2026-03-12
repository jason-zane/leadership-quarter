import { ImageResponse } from 'next/og'

export const alt = 'Leadership Quarter'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          padding: '72px',
          background:
            'linear-gradient(135deg, #f8f3ea 0%, #eef3f7 48%, #dbe6f1 100%)',
          color: '#102033',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            border: '1px solid rgba(16, 32, 51, 0.12)',
            borderRadius: '32px',
            padding: '56px',
            background: 'rgba(255, 255, 255, 0.64)',
            boxShadow: '0 28px 70px rgba(16, 32, 51, 0.10)',
            justifyContent: 'space-between',
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              maxWidth: '760px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: '22px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#4b627f',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Leadership Quarter
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '72px',
                  lineHeight: 1.02,
                  letterSpacing: '-0.04em',
                }}
              >
                <span>Executive search,</span>
                <span>leadership assessment,</span>
                <span style={{ color: '#2f5f99' }}>succession, and AI readiness.</span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: '28px',
                lineHeight: 1.35,
                color: '#314861',
                fontFamily: 'Arial, sans-serif',
                maxWidth: '700px',
              }}
            >
              Helping boards, CEOs, founders, and executive teams make sharper leadership decisions.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              width: '220px',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                display: 'flex',
                height: '220px',
                width: '220px',
                borderRadius: '44px',
                background:
                  'linear-gradient(155deg, rgba(47, 95, 153, 0.16), rgba(255, 255, 255, 0.72))',
                border: '1px solid rgba(47, 95, 153, 0.16)',
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  )
}

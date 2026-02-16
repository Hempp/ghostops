import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#07080a',
          backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 20,
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3h13a2 2 0 0 0 2-2V10a8 8 0 0 0-8-8z" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: 'white',
              fontFamily: 'Georgia, serif',
            }}
          >
            GhostOps
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 600,
              color: 'white',
              marginBottom: 16,
              fontFamily: 'Georgia, serif',
            }}
          >
            AI Co-Founder In Your Pocket
          </span>
          <span
            style={{
              fontSize: 28,
              color: '#9ca3af',
              maxWidth: 800,
              textAlign: 'center',
            }}
          >
            Run your entire business from text messages. No app needed.
          </span>
        </div>

        {/* Features pills */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 48,
          }}
        >
          {['SMS Invoicing', 'AI Social Media', 'Missed Call Recovery'].map((feature) => (
            <div
              key={feature}
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 100,
                padding: '12px 24px',
                color: '#10b981',
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}

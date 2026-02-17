/**
 * Checkout API Route Tests
 * Tests validation, error handling, and Stripe integration
 */

// Mock Stripe before imports
const mockCheckoutSessionsCreate = jest.fn()
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockCheckoutSessionsCreate,
      },
    },
  }))
})

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url,
    json: async () => JSON.parse(init?.body || '{}'),
  })),
  NextResponse: {
    json: (data: any, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => data,
    }),
  },
}))

describe('Checkout API Route', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_mock',
      STRIPE_STARTER_PRICE_ID: 'price_starter_123',
      STRIPE_GROWTH_PRICE_ID: 'price_growth_456',
      STRIPE_PRO_PRICE_ID: 'price_pro_789',
      NEXT_PUBLIC_APP_URL: 'https://ghostops.com',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Plan Validation', () => {
    it('rejects requests without a plan', async () => {
      const { POST } = await import('@/app/api/checkout/route')
      const { NextRequest } = await import('next/server')

      const request = new (NextRequest as any)('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid plan')
    })

    it('rejects invalid plan names', async () => {
      const { POST } = await import('@/app/api/checkout/route')
      const { NextRequest } = await import('next/server')

      const request = new (NextRequest as any)('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'enterprise' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid plan')
      expect(data.error).toContain('starter, growth, pro')
    })

    it('accepts valid starter plan', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_123',
      })

      const { POST } = await import('@/app/api/checkout/route')
      const { NextRequest } = await import('next/server')

      const request = new (NextRequest as any)('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'starter' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/session_123')
    })

    it('accepts valid growth plan', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_456',
      })

      const { POST } = await import('@/app/api/checkout/route')
      const { NextRequest } = await import('next/server')

      const request = new (NextRequest as any)('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'growth' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/session_456')
    })

    it('accepts valid pro plan', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_789',
      })

      const { POST } = await import('@/app/api/checkout/route')
      const { NextRequest } = await import('next/server')

      const request = new (NextRequest as any)('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'pro' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/session_789')
    })
  })

  describe('Price ID Validation', () => {
    it('returns 500 when priceId is not configured', async () => {
      process.env.STRIPE_STARTER_PRICE_ID = ''

      const { POST } = await import('@/app/api/checkout/route')
      const { NextRequest } = await import('next/server')

      const request = new (NextRequest as any)('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'starter' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('not configured')
    })
  })

  describe('Stripe Integration', () => {
    it('creates checkout session with correct parameters', async () => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_test',
      })

      const { POST } = await import('@/app/api/checkout/route')
      const { NextRequest } = await import('next/server')

      const request = new (NextRequest as any)('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'growth' }),
      })

      await POST(request)

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              price: 'price_growth_456',
              quantity: 1,
            },
          ],
          metadata: { plan: 'growth' },
        })
      )
    })

    it('handles Stripe API errors gracefully', async () => {
      mockCheckoutSessionsCreate.mockRejectedValue(
        new Error('Stripe API unavailable')
      )

      const { POST } = await import('@/app/api/checkout/route')
      const { NextRequest } = await import('next/server')

      const request = new (NextRequest as any)('http://localhost/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'starter' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Stripe API unavailable')
    })
  })
})

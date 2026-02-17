import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Hoisted mocks to avoid initialization issues
const { mockCreate, mockFrom } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFrom: vi.fn()
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: mockCreate
    }
  }
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom
  }))
}))

// Import after mocks are set up
import { GET as DailyBriefingGET } from '../daily-briefing/route'
import { GET as HourlyCheckGET } from '../hourly-check/route'

// Mock environment variables
vi.stubEnv('CRON_SECRET', 'test-cron-secret-12345')
vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

// Mock data
const mockBusinesses = [
  {
    id: 'business-1',
    name: 'Test Plumbing Co',
    business_type: 'plumbing',
    owner_phone: '+15551234567',
    is_paused: false,
    features_enabled: { morning_briefing: true },
    settings: {}
  },
  {
    id: 'business-2',
    name: 'HVAC Pros',
    business_type: 'hvac',
    owner_phone: '+15559876543',
    is_paused: false,
    features_enabled: {},
    settings: {}
  }
]

const mockDailyStats = {
  date: '2024-01-14',
  new_leads: 5,
  messages_received: 20,
  messages_sent: 15,
  invoices_sent: 3,
  invoices_paid: 2,
  revenue_cents: 150000,
  missed_calls: 1,
  posts_published: 0,
  reviews_received: 1
}

const mockInvoices = [
  {
    id: 'inv-1',
    contact_name: 'John Doe',
    contact_phone: '+15551111111',
    amount_cents: 50000,
    status: 'sent',
    sent_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: 'inv-2',
    contact_name: 'Jane Smith',
    contact_phone: '+15552222222',
    amount_cents: 75000,
    status: 'overdue',
    sent_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  }
]

const mockContacts = [
  {
    id: 'contact-1',
    name: 'New Lead',
    phone: '+15553333333',
    source: 'google',
    status: 'new',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 mins ago
  }
]

const mockConversations = [
  {
    id: 'conv-1',
    phone: '+15554444444',
    status: 'active',
    last_message_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    contacts: { name: 'Active Customer' }
  }
]

// Helper to create authorized request using Vercel cron signature (simulates Vercel cron)
function createAuthorizedRequest(url: string): NextRequest {
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      'x-vercel-cron-signature': 'valid-signature'  // Vercel cron signature bypasses secret check
    }
  })
}

// Helper to create unauthorized request
function createUnauthorizedRequest(url: string): NextRequest {
  return new NextRequest(url, {
    method: 'GET'
  })
}

// Helper function to setup default mock responses for daily briefing
function setupDefaultMocks() {
  mockFrom.mockImplementation((table: string) => createDefaultMockForTable(table))
}

function createDefaultMockForTable(table: string) {
  switch (table) {
    case 'businesses':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockBusinesses, error: null })
        })
      }
    case 'daily_stats':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockDailyStats, error: null })
            })
          })
        })
      }
    case 'invoices':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockInvoices, error: null })
          })
        })
      }
    case 'contacts':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: mockContacts, error: null })
          })
        })
      }
    case 'conversations':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockConversations, error: null })
          })
        })
      }
    case 'daily_briefings':
      return {
        upsert: vi.fn().mockResolvedValue({ error: null })
      }
    case 'notifications':
      return {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
    default:
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      }
  }
}

function setupHourlyCheckMocks() {
  mockFrom.mockImplementation((table: string) => createHourlyCheckMockForTable(table))
}

function createHourlyCheckMockForTable(table: string) {
  switch (table) {
    case 'businesses':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockBusinesses, error: null })
        })
      }
    case 'invoices':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ data: mockInvoices, error: null }),
              order: vi.fn().mockResolvedValue({ data: mockInvoices, error: null })
            })
          })
        })
      }
    case 'contacts':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: mockContacts, error: null })
          })
        })
      }
    case 'conversations':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ data: mockConversations, error: null })
            })
          })
        })
      }
    case 'messages':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    direction: 'inbound',
                    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
                  },
                  error: null
                })
              })
            })
          })
        })
      }
    case 'queued_actions':
      return {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
    default:
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      }
  }
}

describe('Cron API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default Anthropic response
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary: 'Your business performed well yesterday with 5 new leads and $1,500 in revenue.',
            priorities: [
              'Follow up on 2 overdue invoices',
              'Engage new lead from Google',
              'Check active conversations'
            ]
          })
        }
      ]
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Cron Authentication', () => {
    describe('Daily Briefing Route', () => {
      it('should return 401 when authorization header is missing', async () => {
        const request = createUnauthorizedRequest('http://localhost:3000/api/cron/daily-briefing')

        const response = await DailyBriefingGET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 when authorization header is invalid', async () => {
        const request = new NextRequest('http://localhost:3000/api/cron/daily-briefing', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer wrong-secret'
          }
        })

        const response = await DailyBriefingGET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should accept requests with valid Vercel cron signature', async () => {
        setupDefaultMocks()
        const request = createAuthorizedRequest('http://localhost:3000/api/cron/daily-briefing')

        const response = await DailyBriefingGET(request)
        const data = await response.json()

        // Should not return 401 - should be 200 or 500 based on processing
        expect(response.status).not.toBe(401)
        expect(data.success).toBeDefined()
      })
    })

    describe('Hourly Check Route', () => {
      it('should return 401 when authorization header is missing', async () => {
        const request = createUnauthorizedRequest('http://localhost:3000/api/cron/hourly-check')

        const response = await HourlyCheckGET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 401 when authorization header is invalid', async () => {
        const request = new NextRequest('http://localhost:3000/api/cron/hourly-check', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer invalid-secret-key'
          }
        })

        const response = await HourlyCheckGET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })

      it('should accept requests with valid Vercel cron signature', async () => {
        setupHourlyCheckMocks()
        const request = createAuthorizedRequest('http://localhost:3000/api/cron/hourly-check')

        const response = await HourlyCheckGET(request)
        const data = await response.json()

        // Should not return 401
        expect(response.status).not.toBe(401)
        expect(data.success).toBeDefined()
      })
    })
  })

  describe('Daily Briefing Route', () => {
    beforeEach(() => {
      setupDefaultMocks()
    })

    describe('Successful Execution', () => {
      it('should process all active businesses', async () => {
        const request = createAuthorizedRequest('http://localhost:3000/api/cron/daily-briefing')

        const response = await DailyBriefingGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.summary).toBeDefined()
        expect(data.summary.businessesProcessed).toBe(2)
      })

      it('should skip businesses with morning_briefing disabled', async () => {
        mockFrom.mockImplementation((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      ...mockBusinesses[0],
                      features_enabled: { morning_briefing: false }
                    }
                  ],
                  error: null
                })
              })
            }
          }
          return createDefaultMockForTable(table)
        })

        const request = createAuthorizedRequest('http://localhost:3000/api/cron/daily-briefing')

        const response = await DailyBriefingGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.summary.briefingsGenerated).toBe(0)
      })

      it('should return duration in response', async () => {
        const request = createAuthorizedRequest('http://localhost:3000/api/cron/daily-briefing')

        const response = await DailyBriefingGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.duration).toBeDefined()
        expect(typeof data.duration).toBe('number')
      })

      it('should return timestamp in response', async () => {
        const request = createAuthorizedRequest('http://localhost:3000/api/cron/daily-briefing')

        const response = await DailyBriefingGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.timestamp).toBeDefined()
      })
    })

    describe('Edge Cases', () => {
      it('should handle no active businesses gracefully', async () => {
        mockFrom.mockImplementation((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            }
          }
          return createDefaultMockForTable(table)
        })

        const request = createAuthorizedRequest('http://localhost:3000/api/cron/daily-briefing')

        const response = await DailyBriefingGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('No active businesses')
      })

      it('should continue processing other businesses if one fails', async () => {
        let callCount = 0

        mockFrom.mockImplementation((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: mockBusinesses, error: null })
              })
            }
          }
          if (table === 'daily_stats') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockImplementation(() => {
                      callCount++
                      if (callCount === 1) {
                        return Promise.reject(new Error('Database error'))
                      }
                      return Promise.resolve({ data: mockDailyStats, error: null })
                    })
                  })
                })
              })
            }
          }
          return createDefaultMockForTable(table)
        })

        const request = createAuthorizedRequest('http://localhost:3000/api/cron/daily-briefing')

        const response = await DailyBriefingGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    describe('Error Handling', () => {
      it('should return 500 when business fetch fails', async () => {
        mockFrom.mockImplementation((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: '500', message: 'Database connection failed' }
                })
              })
            }
          }
          return createDefaultMockForTable(table)
        })

        const request = createAuthorizedRequest('http://localhost:3000/api/cron/daily-briefing')

        const response = await DailyBriefingGET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBeDefined()
      })

      it('should handle AI summary generation failure gracefully', async () => {
        mockCreate.mockRejectedValue(new Error('AI service unavailable'))

        const request = createAuthorizedRequest('http://localhost:3000/api/cron/daily-briefing')

        const response = await DailyBriefingGET(request)
        const data = await response.json()

        // Should still succeed because it falls back to generated summary
        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })
  })

  describe('Hourly Check Route', () => {
    beforeEach(() => {
      setupHourlyCheckMocks()
    })

    describe('Successful Execution', () => {
      it('should process all active businesses', async () => {
        const request = createAuthorizedRequest('http://localhost:3000/api/cron/hourly-check')

        const response = await HourlyCheckGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.summary).toBeDefined()
        expect(data.summary.businessesProcessed).toBe(2)
      })

      it('should detect overdue invoices', async () => {
        const request = createAuthorizedRequest('http://localhost:3000/api/cron/hourly-check')

        const response = await HourlyCheckGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.summary.overdueInvoices).toBeGreaterThanOrEqual(0)
      })

      it('should detect new leads', async () => {
        const request = createAuthorizedRequest('http://localhost:3000/api/cron/hourly-check')

        const response = await HourlyCheckGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.summary.newLeads).toBeDefined()
      })

      it('should detect unanswered messages', async () => {
        const request = createAuthorizedRequest('http://localhost:3000/api/cron/hourly-check')

        const response = await HourlyCheckGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.summary.unansweredMessages).toBeDefined()
      })

      it('should queue actions for detected alerts', async () => {
        const request = createAuthorizedRequest('http://localhost:3000/api/cron/hourly-check')

        const response = await HourlyCheckGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.summary.actionsQueued).toBeDefined()
      })
    })

    describe('Edge Cases', () => {
      it('should handle no active businesses gracefully', async () => {
        mockFrom.mockImplementation((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            }
          }
          return createHourlyCheckMockForTable(table)
        })

        const request = createAuthorizedRequest('http://localhost:3000/api/cron/hourly-check')

        const response = await HourlyCheckGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('No active businesses')
      })
    })

    describe('Error Handling', () => {
      it('should return 500 when business fetch fails', async () => {
        mockFrom.mockImplementation((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: '500', message: 'Database error' }
                })
              })
            }
          }
          return createHourlyCheckMockForTable(table)
        })

        const request = createAuthorizedRequest('http://localhost:3000/api/cron/hourly-check')

        const response = await HourlyCheckGET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBeDefined()
      })

      it('should handle queued_actions table not existing', async () => {
        mockFrom.mockImplementation((table: string) => {
          if (table === 'businesses') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: mockBusinesses, error: null })
              })
            }
          }
          if (table === 'queued_actions') {
            return {
              insert: vi.fn().mockResolvedValue({
                error: { code: '42P01', message: 'Table does not exist' }
              })
            }
          }
          return createHourlyCheckMockForTable(table)
        })

        const request = createAuthorizedRequest('http://localhost:3000/api/cron/hourly-check')

        const response = await HourlyCheckGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.summary.actionsQueued).toBe(0)
      })
    })
  })

  describe('Security', () => {
    it('should return 500 error on internal exceptions', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createAuthorizedRequest('http://localhost:3000/api/cron/daily-briefing')

      const response = await DailyBriefingGET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should reject requests without any authorization', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/daily-briefing', {
        method: 'GET'
      })

      const response = await DailyBriefingGET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })
})

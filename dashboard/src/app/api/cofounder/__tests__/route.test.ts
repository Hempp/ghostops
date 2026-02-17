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
import { POST } from '../route'

// Mock environment variables
vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

// Helper to create mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/cofounder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
}

// Mock business data
const mockBusiness = {
  id: 'business-123',
  name: 'Test Plumbing Co',
  business_type: 'plumbing',
  owner_phone: '+15551234567'
}

// Mock stats data
const mockStats = [
  {
    date: '2024-01-15',
    new_leads: 5,
    messages_sent: 20,
    messages_received: 15,
    revenue_cents: 150000
  }
]

// Mock invoices
const mockInvoices = [
  {
    id: 'inv-1',
    contact_name: 'John Doe',
    amount_cents: 50000,
    status: 'sent',
    sent_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  }
]

// Mock contacts
const mockContacts = [
  {
    id: 'contact-1',
    name: 'Jane Smith',
    phone: '+15559876543',
    source: 'website',
    status: 'new',
    created_at: new Date().toISOString()
  }
]

// Helper to setup default successful mock responses
function setupSuccessfulMocks() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'businesses') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockBusiness, error: null })
          })
        })
      }
    }
    if (table === 'daily_stats') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockStats, error: null })
            })
          })
        })
      }
    }
    if (table === 'invoices') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockInvoices, error: null })
          })
        })
      }
    }
    if (table === 'contacts') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockContacts, error: null })
              })
            })
          })
        })
      }
    }
    return {
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    }
  })

  mockCreate.mockResolvedValue({
    content: [
      {
        type: 'text',
        text: 'Your plumbing business is doing well! You had 5 new leads this week.'
      }
    ]
  })
}

describe('Cofounder API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSuccessfulMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Input Validation', () => {
    it('should return 400 when message is missing', async () => {
      const request = createMockRequest({
        businessId: 'business-123'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should return 400 when businessId is missing', async () => {
      const request = createMockRequest({
        message: 'How is my business doing?'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should return 400 when both message and businessId are missing', async () => {
      const request = createMockRequest({})

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })
  })

  describe('Business Lookup', () => {
    it('should return 404 when business is not found', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'Not found' }
                })
              })
            })
          }
        }
        return { select: vi.fn() }
      })

      const request = createMockRequest({
        message: 'How is my business doing?',
        businessId: 'nonexistent-business'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Business not found')
    })

    it('should handle database errors when fetching business', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: '500', message: 'Database error' }
                })
              })
            })
          }
        }
        return { select: vi.fn() }
      })

      const request = createMockRequest({
        message: 'How is my business doing?',
        businessId: 'business-123'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Business not found')
    })
  })

  describe('Successful Chat Responses', () => {
    it('should return AI response with metrics for valid request', async () => {
      const request = createMockRequest({
        message: 'How is my business doing?',
        businessId: 'business-123'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBeDefined()
      expect(data.message).toContain('plumbing')
      expect(data.metrics).toBeDefined()
    })

    it('should pass conversation history to Anthropic', async () => {
      const conversationHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there! How can I help?' }
      ]

      const request = createMockRequest({
        message: 'What about my invoices?',
        businessId: 'business-123',
        conversationHistory
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there! How can I help?' },
            { role: 'user', content: 'What about my invoices?' }
          ])
        })
      )
    })

    it('should limit conversation history to last 10 messages', async () => {
      const conversationHistory = Array(15).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      }))

      const request = createMockRequest({
        message: 'Latest message',
        businessId: 'business-123',
        conversationHistory
      })

      await POST(request)

      const callArgs = mockCreate.mock.calls[0][0]
      // Should have 10 history messages + 1 new message = 11 total
      expect(callArgs.messages.length).toBe(11)
    })

    it('should return metrics in response', async () => {
      const request = createMockRequest({
        message: 'Show me my metrics',
        businessId: 'business-123'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics).toHaveProperty('weeklyLeads')
      expect(data.metrics).toHaveProperty('weeklyMessages')
      expect(data.metrics).toHaveProperty('weeklyRevenue')
      expect(data.metrics).toHaveProperty('unpaidTotal')
      expect(data.metrics).toHaveProperty('monthlyRevenue')
    })
  })

  describe('Industry Expertise', () => {
    it('should include plumbing expertise for plumbing business', async () => {
      const request = createMockRequest({
        message: 'Give me industry tips',
        businessId: 'business-123'
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('PLUMBING')
        })
      )
    })

    it('should include general expertise for unknown business type', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockBusiness, business_type: 'unknown_type' },
                  error: null
                })
              })
            })
          }
        }
        if (table === 'daily_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: mockStats, error: null })
                })
              })
            })
          }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: mockInvoices, error: null })
              })
            })
          }
        }
        if (table === 'contacts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: mockContacts, error: null })
                  })
                })
              })
            })
          }
        }
        return { select: vi.fn() }
      })

      const request = createMockRequest({
        message: 'Give me industry tips',
        businessId: 'business-123'
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('GENERAL BUSINESS EXPERTISE')
        })
      )
    })
  })

  describe('Anthropic API Error Handling', () => {
    it('should return 500 when Anthropic API fails', async () => {
      mockCreate.mockRejectedValue(new Error('Anthropic API error'))

      const request = createMockRequest({
        message: 'How is my business doing?',
        businessId: 'business-123'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate response')
    })

    it('should handle empty response from Anthropic', async () => {
      mockCreate.mockResolvedValue({
        content: []
      })

      const request = createMockRequest({
        message: 'How is my business doing?',
        businessId: 'business-123'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('trouble generating')
    })

    it('should handle non-text response from Anthropic', async () => {
      mockCreate.mockResolvedValue({
        content: [
          { type: 'image', data: 'base64data' }
        ]
      })

      const request = createMockRequest({
        message: 'How is my business doing?',
        businessId: 'business-123'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('trouble generating')
    })
  })

  describe('Request Parsing', () => {
    it('should handle malformed JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/cofounder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'not valid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate response')
    })
  })

  describe('Empty Data Handling', () => {
    it('should handle empty stats gracefully', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockBusiness, error: null })
              })
            })
          }
        }
        if (table === 'daily_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null })
                })
              })
            })
          }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          }
        }
        if (table === 'contacts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: [], error: null })
                  })
                })
              })
            })
          }
        }
        return { select: vi.fn() }
      })

      const request = createMockRequest({
        message: 'Show me my metrics',
        businessId: 'business-123'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics.weeklyLeads).toBe(0)
      expect(data.metrics.weeklyRevenue).toBe(0)
      expect(data.metrics.unpaidTotal).toBe(0)
    })

    it('should handle null data from database', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockBusiness, error: null })
              })
            })
          }
        }
        if (table === 'daily_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            })
          }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          }
        }
        if (table === 'contacts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: null, error: null })
                  })
                })
              })
            })
          }
        }
        return { select: vi.fn() }
      })

      const request = createMockRequest({
        message: 'Show me my metrics',
        businessId: 'business-123'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics).toBeDefined()
    })
  })
})

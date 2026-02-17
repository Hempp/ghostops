import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

// Set environment variables before any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid'
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token'
process.env.TWILIO_PHONE_NUMBER = '+15550001234'
process.env.INTERNAL_API_KEY = 'test-internal-api-key'

// Hoisted mocks to avoid initialization issues
const { mockFrom, mockAuth, mockMessagesCreate } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAuth: {
    getUser: vi.fn()
  },
  mockMessagesCreate: vi.fn()
}))

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: mockAuth
  }))
}))

// Mock Twilio - return a mock client that has messages.create
vi.mock('twilio', () => ({
  default: vi.fn(() => ({
    messages: {
      create: mockMessagesCreate
    }
  }))
}))

// Import after mocks are set up
import { POST } from '../route'

// Helper to create mock request
function createMockRequest(
  body: Record<string, unknown>,
  authHeader?: string
): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (authHeader) {
    headers['Authorization'] = authHeader
  }
  return new NextRequest('http://localhost:3000/api/sms/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
}

// Mock data
const mockBusiness = {
  id: 'business-123',
  name: 'Test Plumbing Co',
  is_paused: false,
  twilio_number: '+15550009999'
}

const mockBusinessUser = {
  business_id: 'business-123',
  role: 'owner'
}

const mockConversation = {
  id: 'conv-123'
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
}

const mockTwilioResult = {
  sid: 'SM1234567890abcdef'
}

// Helper to setup default successful mock responses
function setupSuccessfulMocks() {
  // Reset all mocks
  mockAuth.getUser.mockReset()
  mockFrom.mockReset()
  mockMessagesCreate.mockReset()

  // Auth mock - valid user
  mockAuth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null
  })

  // Twilio mock - successful send
  mockMessagesCreate.mockResolvedValue(mockTwilioResult)

  // Supabase from mock
  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'business_users':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockBusinessUser,
                  error: null
                })
              })
            })
          })
        }
      case 'businesses':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockBusiness,
                error: null
              })
            })
          })
        }
      case 'conversations':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockConversation,
                  error: null
                })
              })
            })
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'new-conv-123' },
                error: null
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        }
      case 'messages':
        return {
          insert: vi.fn().mockResolvedValue({ error: null })
        }
      case 'daily_stats':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'stat-1', messages_sent: 5 },
                  error: null
                })
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          }),
          insert: vi.fn().mockResolvedValue({ error: null })
        }
      default:
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }
    }
  })
}

describe('SMS Send API Route', () => {
  beforeAll(() => {
    // Ensure environment variables are set
    process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid'
    process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token'
    process.env.TWILIO_PHONE_NUMBER = '+15550001234'
    process.env.INTERNAL_API_KEY = 'test-internal-api-key'
  })

  beforeEach(() => {
    vi.clearAllMocks()
    setupSuccessfulMocks()
  })

  afterEach(() => {
    // Restore env vars
    process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid'
    process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token'
    process.env.TWILIO_PHONE_NUMBER = '+15550001234'
  })

  describe('Authentication', () => {
    it('should return 401 when authorization header is missing', async () => {
      const request = createMockRequest({
        to: '+15551234567',
        message: 'Test message',
        businessId: 'business-123'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing authorization header')
    })

    it('should return 401 when token is invalid', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer invalid-token'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid or expired token')
    })

    it('should return 401 when user does not have access to business', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'business_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'Not found' }
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

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer valid-token'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('User does not have access to this business')
    })

    it('should accept valid bearer token authentication', async () => {
      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer valid-token'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.messageId).toBeDefined()
    })

    it('should accept internal API key authentication', async () => {
      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 401 for invalid authorization format', async () => {
      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Basic dXNlcm5hbWU6cGFzc3dvcmQ='
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid authorization format')
    })
  })

  describe('Input Validation', () => {
    it('should return 400 when "to" field is missing', async () => {
      const request = createMockRequest(
        {
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing required fields: to, message, businessId')
    })

    it('should return 400 when "message" field is missing', async () => {
      const request = createMockRequest(
        {
          to: '+15551234567',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing required fields: to, message, businessId')
    })

    it('should return 400 when "businessId" field is missing', async () => {
      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing required fields: to, message, businessId')
    })

    it('should return 400 when all required fields are missing', async () => {
      const request = createMockRequest({}, 'Bearer test-internal-api-key')

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing required fields: to, message, businessId')
    })

    it('should return 400 for invalid phone number format', async () => {
      const request = createMockRequest(
        {
          to: 'invalid-phone',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid phone number format')
    })

    it('should return 400 for too short phone number', async () => {
      const request = createMockRequest(
        {
          to: '+1555',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid phone number format')
    })

    it('should return 400 when message is too long', async () => {
      const longMessage = 'a'.repeat(1601)
      const request = createMockRequest(
        {
          to: '+15551234567',
          message: longMessage,
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Message too long. Maximum 1600 characters.')
    })

    it('should accept message at max length (1600 characters)', async () => {
      const maxMessage = 'a'.repeat(1600)
      const request = createMockRequest(
        {
          to: '+15551234567',
          message: maxMessage,
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Phone Number Normalization', () => {
    it('should normalize phone number with spaces', async () => {
      const request = createMockRequest(
        {
          to: '+1 555 123 4567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+15551234567'
        })
      )
    })

    it('should normalize phone number with dashes', async () => {
      const request = createMockRequest(
        {
          to: '+1-555-123-4567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+15551234567'
        })
      )
    })

    it('should normalize phone number with parentheses', async () => {
      const request = createMockRequest(
        {
          to: '(555) 123-4567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+15551234567'
        })
      )
    })

    it('should add +1 prefix for US numbers without country code', async () => {
      const request = createMockRequest(
        {
          to: '5551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+15551234567'
        })
      )
    })

    it('should preserve existing + prefix in international numbers', async () => {
      const request = createMockRequest(
        {
          to: '+447700900123',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+447700900123'
        })
      )
    })

    it('should normalize phone number with dots', async () => {
      const request = createMockRequest(
        {
          to: '555.123.4567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+15551234567'
        })
      )
    })
  })

  describe('Business Validation', () => {
    it('should return 404 when business is not found', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'business_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBusinessUser,
                    error: null
                  })
                })
              })
            })
          }
        }
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
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'nonexistent-business'
        },
        'Bearer valid-token'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Business not found')
    })

    it('should return 403 when business is paused', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'business_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBusinessUser,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockBusiness, is_paused: true },
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer valid-token'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Business is paused. Cannot send messages.')
    })
  })

  describe('Twilio Integration', () => {
    it('should return 503 when no sending phone number is configured', async () => {
      // Remove the default Twilio phone number
      const originalTwilioPhone = process.env.TWILIO_PHONE_NUMBER
      process.env.TWILIO_PHONE_NUMBER = ''

      mockFrom.mockImplementation((table: string) => {
        if (table === 'business_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBusinessUser,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockBusiness, twilio_number: null },
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer valid-token'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.success).toBe(false)
      expect(data.error).toBe('No sending phone number configured for this business')

      // Restore
      process.env.TWILIO_PHONE_NUMBER = originalTwilioPhone
    })

    it('should return 502 when Twilio send fails', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('Twilio API error'))

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.success).toBe(false)
      expect(data.error).toContain('SMS delivery failed')
      expect(data.error).toContain('Twilio API error')
    })

    it('should successfully send SMS via Twilio', async () => {
      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.messageId).toBe('SM1234567890abcdef')
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        body: 'Test message',
        from: '+15550009999',
        to: '+15551234567'
      })
    })

    it('should use business Twilio number when available', async () => {
      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      await POST(request)

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '+15550009999' // Business Twilio number
        })
      )
    })

    it('should fall back to default Twilio number when business has none', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'business_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBusinessUser,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockBusiness, twilio_number: null },
                  error: null
                })
              })
            })
          }
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockConversation,
                    error: null
                  })
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        if (table === 'messages') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'daily_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'stat-1', messages_sent: 5 },
                    error: null
                  })
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      await POST(request)

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '+15550001234' // Default TWILIO_PHONE_NUMBER
        })
      )
    })
  })

  describe('Conversation and Message Logging', () => {
    it('should use provided conversationId', async () => {
      let insertedMessage: Record<string, unknown> | null = null

      mockFrom.mockImplementation((table: string) => {
        if (table === 'business_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBusinessUser,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockBusiness,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'conversations') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        if (table === 'messages') {
          return {
            insert: vi.fn((data) => {
              insertedMessage = data
              return Promise.resolve({ error: null })
            })
          }
        }
        if (table === 'daily_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'stat-1', messages_sent: 5 },
                    error: null
                  })
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123',
          conversationId: 'existing-conv-456'
        },
        'Bearer test-internal-api-key'
      )

      await POST(request)

      expect(insertedMessage).toMatchObject({
        conversation_id: 'existing-conv-456',
        business_id: 'business-123',
        direction: 'outbound',
        content: 'Test message',
        message_type: 'text',
        ai_generated: false,
        media_urls: [],
        twilio_sid: 'SM1234567890abcdef'
      })
    })

    it('should create new conversation when not provided', async () => {
      let conversationInsertCalled = false
      let messageInsertCalled = false

      mockFrom.mockImplementation((table: string) => {
        if (table === 'business_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBusinessUser,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockBusiness,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null, // No existing conversation
                    error: { code: 'PGRST116', message: 'Not found' }
                  })
                })
              })
            }),
            insert: vi.fn(() => {
              conversationInsertCalled = true
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'new-conv-789' },
                    error: null
                  })
                })
              }
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        if (table === 'messages') {
          return {
            insert: vi.fn(() => {
              messageInsertCalled = true
              return Promise.resolve({ error: null })
            })
          }
        }
        if (table === 'daily_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'stat-1', messages_sent: 5 },
                    error: null
                  })
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(conversationInsertCalled).toBe(true)
      expect(messageInsertCalled).toBe(true)
    })

    it('should find existing conversation by phone number', async () => {
      let conversationSelectCalled = false

      mockFrom.mockImplementation((table: string) => {
        if (table === 'business_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBusinessUser,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockBusiness,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn(() => {
                conversationSelectCalled = true
                return {
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'existing-conv-999' },
                      error: null
                    })
                  })
                }
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        if (table === 'messages') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'daily_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'stat-1', messages_sent: 5 },
                    error: null
                  })
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      await POST(request)

      expect(conversationSelectCalled).toBe(true)
    })

    it('should update daily stats on successful send', async () => {
      let statsUpdateCalled = false

      mockFrom.mockImplementation((table: string) => {
        if (table === 'business_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBusinessUser,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockBusiness,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockConversation,
                    error: null
                  })
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        if (table === 'messages') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'daily_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'stat-1', messages_sent: 5 },
                    error: null
                  })
                })
              })
            }),
            update: vi.fn(() => {
              statsUpdateCalled = true
              return {
                eq: vi.fn().mockResolvedValue({ error: null })
              }
            })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      await POST(request)

      expect(statsUpdateCalled).toBe(true)
    })

    it('should create new daily stats record when none exists', async () => {
      let statsInsertCalled = false

      mockFrom.mockImplementation((table: string) => {
        if (table === 'business_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBusinessUser,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockBusiness,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockConversation,
                    error: null
                  })
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        if (table === 'messages') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'daily_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null, // No existing stats
                    error: null
                  })
                })
              })
            }),
            insert: vi.fn(() => {
              statsInsertCalled = true
              return Promise.resolve({ error: null })
            })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      await POST(request)

      expect(statsInsertCalled).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-internal-api-key'
        },
        body: 'not valid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle database errors gracefully', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should continue even if message logging fails', async () => {
      let messageInsertError = false

      mockFrom.mockImplementation((table: string) => {
        if (table === 'business_users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockBusinessUser,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockBusiness,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockConversation,
                    error: null
                  })
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        if (table === 'messages') {
          messageInsertError = true
          return {
            insert: vi.fn().mockResolvedValue({
              error: { code: '500', message: 'Insert failed' }
            })
          }
        }
        if (table === 'daily_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'stat-1', messages_sent: 5 },
                    error: null
                  })
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      // SMS was sent successfully, so response should still be success
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(messageInsertError).toBe(true)
    })
  })

  describe('Response Format', () => {
    it('should return success response with messageId', async () => {
      const request = createMockRequest(
        {
          to: '+15551234567',
          message: 'Test message',
          businessId: 'business-123'
        },
        'Bearer test-internal-api-key'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        messageId: 'SM1234567890abcdef'
      })
    })

    it('should return error response with success false', async () => {
      const request = createMockRequest({}, 'Bearer test-internal-api-key')

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })
})

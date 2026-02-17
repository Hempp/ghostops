import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '../route'

// Mock Supabase
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const mockLt = vi.fn()

const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom
  }))
}))

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

// Mock notification data
const mockNotifications = [
  {
    id: 'notif-1',
    business_id: 'business-123',
    type: 'lead_alert',
    title: 'New Lead!',
    message: 'You have a new lead from Google Ads',
    channel: 'sms',
    priority: 'high',
    status: 'sent',
    metadata: { source: 'google_ads' },
    scheduled_for: null,
    sent_at: '2024-01-15T10:00:00Z',
    read_at: null,
    error: null,
    created_at: '2024-01-15T09:55:00Z'
  },
  {
    id: 'notif-2',
    business_id: 'business-123',
    type: 'invoice_reminder',
    title: 'Invoice Overdue',
    message: 'Invoice #1234 is overdue',
    channel: 'email',
    priority: 'medium',
    status: 'pending',
    metadata: { invoice_id: '1234' },
    scheduled_for: '2024-01-16T09:00:00Z',
    sent_at: null,
    read_at: null,
    error: null,
    created_at: '2024-01-15T08:00:00Z'
  },
  {
    id: 'notif-3',
    business_id: 'business-123',
    type: 'system',
    title: 'System Update',
    message: 'New features available',
    channel: 'in_app',
    priority: 'low',
    status: 'read',
    metadata: {},
    scheduled_for: null,
    sent_at: '2024-01-14T12:00:00Z',
    read_at: '2024-01-14T14:00:00Z',
    error: null,
    created_at: '2024-01-14T11:00:00Z'
  }
]

describe('Notifications API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('GET /api/notifications', () => {
    beforeEach(() => {
      // Setup default mock chain
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockNotifications,
                    error: null,
                    count: mockNotifications.length
                  })
                }),
                range: vi.fn().mockResolvedValue({
                  data: mockNotifications,
                  error: null,
                  count: mockNotifications.length
                })
              })
            })
          })
        })
      }))
    })

    describe('Input Validation', () => {
      it('should return 400 when businessId is missing', async () => {
        const request = new NextRequest('http://localhost:3000/api/notifications')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Missing required parameter: businessId')
      })
    })

    describe('Successful Fetching', () => {
      it('should return notifications for valid businessId', async () => {
        const unreadNotifications = mockNotifications.filter(n => n.status !== 'read')

        mockFrom.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({
                      data: mockNotifications,
                      error: null,
                      count: mockNotifications.length
                    })
                  }),
                  range: vi.fn().mockResolvedValue({
                    data: mockNotifications,
                    error: null,
                    count: mockNotifications.length
                  })
                })
              })
            })
          })
        }))

        const request = new NextRequest(
          'http://localhost:3000/api/notifications?businessId=business-123'
        )

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.notifications).toBeDefined()
        expect(data.total).toBeDefined()
        expect(data.pagination).toBeDefined()
      })

      it('should filter by unreadOnly parameter', async () => {
        const unreadNotifications = mockNotifications.filter(
          n => n.status === 'sent' || n.status === 'pending'
        )

        mockFrom.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: unreadNotifications,
                    error: null,
                    count: unreadNotifications.length
                  })
                })
              })
            })
          })
        }))

        const request = new NextRequest(
          'http://localhost:3000/api/notifications?businessId=business-123&unreadOnly=true'
        )

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        // Verify that all returned notifications are unread
        if (data.notifications.length > 0) {
          data.notifications.forEach((n: { status: string }) => {
            expect(['sent', 'pending']).toContain(n.status)
          })
        }
      })

      it('should filter by type parameter', async () => {
        const leadNotifications = mockNotifications.filter(n => n.type === 'lead_alert')

        mockFrom.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue({
                      data: leadNotifications,
                      error: null,
                      count: leadNotifications.length
                    })
                  })
                })
              })
            })
          })
        }))

        const request = new NextRequest(
          'http://localhost:3000/api/notifications?businessId=business-123&type=lead_alert'
        )

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
      })

      it('should respect pagination parameters', async () => {
        mockFrom.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [mockNotifications[0]],
                    error: null,
                    count: mockNotifications.length
                  })
                })
              })
            })
          })
        }))

        const request = new NextRequest(
          'http://localhost:3000/api/notifications?businessId=business-123&limit=1&offset=0'
        )

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.pagination.limit).toBe(1)
        expect(data.pagination.offset).toBe(0)
        expect(data.pagination.hasMore).toBe(true)
      })

      it('should return unreadCount in response', async () => {
        mockFrom.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockNotifications,
                    error: null,
                    count: mockNotifications.length
                  })
                })
              })
            })
          })
        }))

        const request = new NextRequest(
          'http://localhost:3000/api/notifications?businessId=business-123'
        )

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.unreadCount).toBeDefined()
        expect(typeof data.unreadCount).toBe('number')
      })
    })

    describe('Error Handling', () => {
      it('should return 500 when database query fails', async () => {
        mockFrom.mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: '500', message: 'Database error' },
                    count: null
                  })
                })
              })
            })
          })
        }))

        const request = new NextRequest(
          'http://localhost:3000/api/notifications?businessId=business-123'
        )

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to fetch notifications')
      })
    })
  })

  describe('PATCH /api/notifications', () => {
    describe('Input Validation', () => {
      it('should return 400 when businessId is missing', async () => {
        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read', notificationId: 'notif-1' })
        })

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Missing required field: businessId')
      })

      it('should return 400 for invalid action', async () => {
        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: 'business-123',
            action: 'invalid_action',
            notificationId: 'notif-1'
          })
        })

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid action')
      })

      it('should return 400 when notificationId is missing for mark_read', async () => {
        mockFrom.mockImplementation(() => ({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null })
            })
          })
        }))

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: 'business-123',
            action: 'mark_read'
          })
        })

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Must provide notificationId')
      })
    })

    describe('Mark Read Action', () => {
      it('should mark single notification as read', async () => {
        mockFrom.mockImplementation(() => ({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null })
            })
          })
        }))

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: 'business-123',
            action: 'mark_read',
            notificationId: 'notif-1'
          })
        })

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('1 notification')
      })

      it('should mark multiple notifications as read', async () => {
        mockFrom.mockImplementation(() => ({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null })
            })
          })
        }))

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: 'business-123',
            action: 'mark_read',
            notificationIds: ['notif-1', 'notif-2']
          })
        })

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('2 notification')
      })
    })

    describe('Mark All Read Action', () => {
      it('should mark all notifications as read', async () => {
        mockFrom.mockImplementation(() => ({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null, count: 5 })
            })
          })
        }))

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: 'business-123',
            action: 'mark_all_read'
          })
        })

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('all notifications')
      })
    })

    describe('Dismiss Action', () => {
      it('should dismiss notification(s)', async () => {
        mockFrom.mockImplementation(() => ({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null })
            })
          })
        }))

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: 'business-123',
            action: 'dismiss',
            notificationId: 'notif-1'
          })
        })

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('Dismissed')
      })

      it('should return 400 when notificationId is missing for dismiss', async () => {
        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: 'business-123',
            action: 'dismiss'
          })
        })

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Must provide notificationId')
      })
    })

    describe('Error Handling', () => {
      it('should return 500 when database update fails', async () => {
        mockFrom.mockImplementation(() => ({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                error: { code: '500', message: 'Database error' }
              })
            })
          })
        }))

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: 'business-123',
            action: 'mark_read',
            notificationId: 'notif-1'
          })
        })

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to update notifications')
      })

      it('should handle malformed JSON body', async () => {
        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: 'not valid json'
        })

        const response = await PATCH(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to update notifications')
      })
    })
  })

  describe('DELETE /api/notifications', () => {
    describe('Input Validation', () => {
      it('should return 400 when businessId is missing', async () => {
        const request = new NextRequest('http://localhost:3000/api/notifications')

        const response = await DELETE(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Missing required parameter: businessId')
      })
    })

    describe('Successful Deletion', () => {
      it('should delete old read notifications with default 30 days', async () => {
        mockFrom.mockImplementation(() => ({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({ error: null, count: 10 })
              })
            })
          })
        }))

        const request = new NextRequest(
          'http://localhost:3000/api/notifications?businessId=business-123'
        )

        const response = await DELETE(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('Deleted')
      })

      it('should delete notifications older than specified days', async () => {
        mockFrom.mockImplementation(() => ({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({ error: null, count: 5 })
              })
            })
          })
        }))

        const request = new NextRequest(
          'http://localhost:3000/api/notifications?businessId=business-123&olderThanDays=60'
        )

        const response = await DELETE(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.count).toBe(5)
      })

      it('should return count of 0 when no notifications to delete', async () => {
        mockFrom.mockImplementation(() => ({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({ error: null, count: null })
              })
            })
          })
        }))

        const request = new NextRequest(
          'http://localhost:3000/api/notifications?businessId=business-123'
        )

        const response = await DELETE(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('0 old notifications')
      })
    })

    describe('Error Handling', () => {
      it('should return 500 when database delete fails', async () => {
        mockFrom.mockImplementation(() => ({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({
                  error: { code: '500', message: 'Database error' },
                  count: null
                })
              })
            })
          })
        }))

        const request = new NextRequest(
          'http://localhost:3000/api/notifications?businessId=business-123'
        )

        const response = await DELETE(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to delete notifications')
      })
    })
  })

  describe('Security Considerations', () => {
    it('should only access notifications for the specified business', async () => {
      let queriedBusinessId: string | null = null

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field: string, value: string) => {
            if (field === 'business_id') {
              queriedBusinessId = value
            }
            return {
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0
                  })
                })
              })
            }
          })
        })
      }))

      const request = new NextRequest(
        'http://localhost:3000/api/notifications?businessId=business-456'
      )

      await GET(request)

      expect(queriedBusinessId).toBe('business-456')
    })

    it('should validate businessId in PATCH requests', async () => {
      let queriedBusinessId: string | null = null

      mockFrom.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field: string, value: string) => {
            if (field === 'business_id') {
              queriedBusinessId = value
            }
            return {
              in: vi.fn().mockResolvedValue({ error: null })
            }
          })
        })
      }))

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'business-789',
          action: 'mark_read',
          notificationId: 'notif-1'
        })
      })

      await PATCH(request)

      expect(queriedBusinessId).toBe('business-789')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty notification list', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                  count: 0
                })
              })
            })
          })
        })
      }))

      const request = new NextRequest(
        'http://localhost:3000/api/notifications?businessId=business-123'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notifications).toEqual([])
      expect(data.total).toBe(0)
      expect(data.pagination.hasMore).toBe(false)
    })

    it('should handle large offset values', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                  count: 5
                })
              })
            })
          })
        })
      }))

      const request = new NextRequest(
        'http://localhost:3000/api/notifications?businessId=business-123&offset=1000'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notifications).toEqual([])
      expect(data.pagination.hasMore).toBe(false)
    })

    it('should parse limit parameter as integer', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockNotifications.slice(0, 5),
                  error: null,
                  count: 10
                })
              })
            })
          })
        })
      }))

      const request = new NextRequest(
        'http://localhost:3000/api/notifications?businessId=business-123&limit=5.7'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.limit).toBe(5)
    })
  })
})

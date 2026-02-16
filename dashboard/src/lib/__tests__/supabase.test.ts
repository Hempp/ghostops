import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoist the mocks so they're available before module initialization
const { mockSelect, mockUpdate, mockEq, mockSingle, mockFrom } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockSingle: vi.fn(),
  mockFrom: vi.fn(),
}))

// Mock the createBrowserClient using hoisted mocks
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    from: mockFrom,
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  }),
}))

// Import after mocking
import {
  getBusinessSettings,
  updateBusinessSettings,
  getBusiness,
  type Business,
} from '../supabase'

describe('Supabase Settings Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default chain for select queries
    mockFrom.mockImplementation(() => ({
      select: mockSelect,
      update: mockUpdate,
    }))

    mockSelect.mockReturnValue({
      eq: mockEq,
    })

    mockEq.mockReturnValue({
      single: mockSingle,
    })

    // Setup chain for update queries
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getBusinessSettings', () => {
    it('should return default settings when business is not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const settings = await getBusinessSettings('non-existent-id')

      expect(settings).toEqual({
        aiEnabled: true,
        autoReply: true,
        workingHoursOnly: false,
        notifyOnNewLead: true,
        notifyOnPayment: true,
        notifyOnMissedCall: true,
        darkMode: true,
        soundEnabled: false,
      })
    })

    it('should return settings from business features_enabled and settings', async () => {
      const mockBusiness: Business = {
        id: 'test-business-id',
        name: 'Test Business',
        owner_email: 'test@example.com',
        owner_name: 'Test Owner',
        owner_phone: '+1234567890',
        is_paused: false,
        features_enabled: {
          ai_enabled: false,
          auto_reply: false,
          working_hours_only: true,
        },
        settings: {
          notify_on_new_lead: false,
          notify_on_payment: false,
          notify_on_missed_call: false,
          dark_mode: false,
          sound_enabled: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSingle.mockResolvedValue({
        data: mockBusiness,
        error: null,
      })

      const settings = await getBusinessSettings('test-business-id')

      expect(settings).toEqual({
        aiEnabled: false,
        autoReply: false,
        workingHoursOnly: true,
        notifyOnNewLead: false,
        notifyOnPayment: false,
        notifyOnMissedCall: false,
        darkMode: false,
        soundEnabled: true,
      })
    })

    it('should use defaults for missing features_enabled and settings fields', async () => {
      const mockBusiness: Business = {
        id: 'test-business-id',
        name: 'Test Business',
        owner_email: 'test@example.com',
        owner_name: 'Test Owner',
        owner_phone: '+1234567890',
        is_paused: false,
        features_enabled: {},
        settings: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSingle.mockResolvedValue({
        data: mockBusiness,
        error: null,
      })

      const settings = await getBusinessSettings('test-business-id')

      // Should use default values
      expect(settings.aiEnabled).toBe(true)
      expect(settings.autoReply).toBe(true)
      expect(settings.workingHoursOnly).toBe(false)
      expect(settings.notifyOnNewLead).toBe(true)
      expect(settings.darkMode).toBe(true)
    })

    it('should fall back to speed_to_lead for autoReply if auto_reply not set', async () => {
      const mockBusiness: Business = {
        id: 'test-business-id',
        name: 'Test Business',
        owner_email: null,
        owner_name: null,
        owner_phone: null,
        is_paused: false,
        features_enabled: {
          speed_to_lead: true,
          // auto_reply not set
        },
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSingle.mockResolvedValue({
        data: mockBusiness,
        error: null,
      })

      const settings = await getBusinessSettings('test-business-id')

      expect(settings.autoReply).toBe(true)
    })
  })

  describe('updateBusinessSettings', () => {
    it('should throw error when business is not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      await expect(updateBusinessSettings('non-existent-id', { aiEnabled: false }))
        .rejects.toThrow('Business not found')
    })

    it('should update features_enabled fields correctly', async () => {
      const mockBusiness: Business = {
        id: 'test-business-id',
        name: 'Test Business',
        owner_email: 'test@example.com',
        owner_name: 'Test Owner',
        owner_phone: '+1234567890',
        is_paused: false,
        features_enabled: {
          ai_enabled: true,
          auto_reply: true,
        },
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSingle.mockResolvedValue({
        data: mockBusiness,
        error: null,
      })

      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      })

      await updateBusinessSettings('test-business-id', {
        aiEnabled: false,
        workingHoursOnly: true,
      })

      expect(mockFrom).toHaveBeenCalledWith('businesses')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          features_enabled: expect.objectContaining({
            ai_enabled: false,
            auto_reply: true,
            working_hours_only: true,
          }),
        })
      )
    })

    it('should update settings fields correctly', async () => {
      const mockBusiness: Business = {
        id: 'test-business-id',
        name: 'Test Business',
        owner_email: 'test@example.com',
        owner_name: 'Test Owner',
        owner_phone: '+1234567890',
        is_paused: false,
        features_enabled: {},
        settings: {
          dark_mode: true,
          sound_enabled: false,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSingle.mockResolvedValue({
        data: mockBusiness,
        error: null,
      })

      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      })

      await updateBusinessSettings('test-business-id', {
        darkMode: false,
        notifyOnNewLead: false,
      })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            dark_mode: false,
            sound_enabled: false,
            notify_on_new_lead: false,
          }),
        })
      )
    })

    it('should throw error when update fails', async () => {
      const mockBusiness: Business = {
        id: 'test-business-id',
        name: 'Test Business',
        owner_email: null,
        owner_name: null,
        owner_phone: null,
        is_paused: false,
        features_enabled: {},
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSingle.mockResolvedValue({
        data: mockBusiness,
        error: null,
      })

      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: { message: 'Database error' },
      })
      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      })

      await expect(updateBusinessSettings('test-business-id', { aiEnabled: false }))
        .rejects.toEqual({ message: 'Database error' })
    })
  })

  describe('getBusiness', () => {
    it('should return null when business is not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const business = await getBusiness('non-existent-id')

      expect(business).toBeNull()
    })

    it('should return business data when found', async () => {
      const mockBusiness: Business = {
        id: 'test-business-id',
        name: 'Test Business',
        owner_email: 'test@example.com',
        owner_name: 'Test Owner',
        owner_phone: '+1234567890',
        is_paused: false,
        features_enabled: {},
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSingle.mockResolvedValue({
        data: mockBusiness,
        error: null,
      })

      const business = await getBusiness('test-business-id')

      expect(business).toEqual(mockBusiness)
      expect(mockFrom).toHaveBeenCalledWith('businesses')
    })

    it('should throw error for non-404 errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST001', message: 'Database connection error' },
      })

      await expect(getBusiness('test-business-id'))
        .rejects.toEqual({ code: 'PGRST001', message: 'Database connection error' })
    })
  })
})

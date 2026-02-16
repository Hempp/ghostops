'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  Ghost,
  Building2,
  Phone,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Wrench,
  Zap,
  Flame,
  Paintbrush,
  Car,
  Scissors,
  Home,
  UtensilsCrossed,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const BUSINESS_TYPES = [
  { id: 'plumbing', label: 'Plumbing', icon: Wrench, color: 'blue' },
  { id: 'electrical', label: 'Electrical', icon: Zap, color: 'yellow' },
  { id: 'hvac', label: 'HVAC', icon: Flame, color: 'orange' },
  { id: 'painting', label: 'Painting', icon: Paintbrush, color: 'purple' },
  { id: 'auto', label: 'Auto Services', icon: Car, color: 'red' },
  { id: 'salon', label: 'Salon/Spa', icon: Scissors, color: 'pink' },
  { id: 'cleaning', label: 'Cleaning', icon: Home, color: 'green' },
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, color: 'amber' },
  { id: 'other', label: 'Other', icon: Building2, color: 'gray' },
]

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'business', title: 'Your Business' },
  { id: 'services', title: 'Services' },
  { id: 'hours', title: 'Hours' },
  { id: 'ai', title: 'AI Settings' },
  { id: 'complete', title: 'Complete' },
]

interface OnboardingData {
  businessType: string
  businessName: string
  ownerName: string
  phone: string
  services: string[]
  businessHours: Record<string, { open: string; close: string; closed: boolean }>
  brandVoice: string
  aiPersonality: string
}

const DEFAULT_HOURS = {
  mon: { open: '09:00', close: '17:00', closed: false },
  tue: { open: '09:00', close: '17:00', closed: false },
  wed: { open: '09:00', close: '17:00', closed: false },
  thu: { open: '09:00', close: '17:00', closed: false },
  fri: { open: '09:00', close: '17:00', closed: false },
  sat: { open: '10:00', close: '14:00', closed: false },
  sun: { open: '10:00', close: '14:00', closed: true },
}

const SERVICE_SUGGESTIONS: Record<string, string[]> = {
  plumbing: ['Emergency Repairs', 'Drain Cleaning', 'Water Heater', 'Pipe Installation', 'Leak Detection', 'Bathroom Remodel'],
  electrical: ['Panel Upgrades', 'Rewiring', 'Lighting Install', 'EV Charger', 'Outlet Repair', 'Smart Home'],
  hvac: ['AC Repair', 'Heating Install', 'Duct Cleaning', 'Maintenance Plans', 'Thermostat Install', 'Air Quality'],
  painting: ['Interior Painting', 'Exterior Painting', 'Cabinet Refinish', 'Wallpaper', 'Deck Staining', 'Commercial'],
  auto: ['Oil Change', 'Brake Service', 'Tire Rotation', 'Engine Repair', 'Diagnostics', 'Detailing'],
  salon: ['Haircut', 'Color', 'Styling', 'Manicure', 'Pedicure', 'Facial', 'Massage'],
  cleaning: ['Deep Cleaning', 'Regular Cleaning', 'Move-in/out', 'Office Cleaning', 'Carpet Cleaning', 'Window Cleaning'],
  restaurant: ['Dine-in', 'Takeout', 'Delivery', 'Catering', 'Private Events', 'Reservations'],
  other: ['Consultation', 'Service Call', 'Installation', 'Repair', 'Maintenance'],
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, businessId } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    businessType: '',
    businessName: '',
    ownerName: '',
    phone: '',
    services: [],
    businessHours: DEFAULT_HOURS,
    brandVoice: 'professional',
    aiPersonality: 'friendly',
  })

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const completeOnboarding = async () => {
    if (!businessId) return

    setSaving(true)
    try {
      // Format business hours for storage
      const formattedHours: Record<string, string> = {}
      Object.entries(data.businessHours).forEach(([day, hours]) => {
        if (hours.closed) {
          formattedHours[day] = 'Closed'
        } else {
          formattedHours[day] = `${hours.open}-${hours.close}`
        }
      })

      // Update business record
      const { error } = await supabase
        .from('businesses')
        .update({
          name: data.businessName,
          owner_name: data.ownerName,
          owner_phone: data.phone,
          business_type: data.businessType,
          services: data.services,
          business_hours: formattedHours,
          brand_voice: data.brandVoice,
          onboarding_complete: true,
          onboarding_step: 'complete',
          settings: {
            ai_personality: data.aiPersonality,
            sound_enabled: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId)

      if (error) throw error

      // Redirect to dashboard
      router.push('/')
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setSaving(false)
    }
  }

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return <WelcomeStep onNext={nextStep} />
      case 'business':
        return (
          <BusinessStep
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 'services':
        return (
          <ServicesStep
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 'hours':
        return (
          <HoursStep
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 'ai':
        return (
          <AISettingsStep
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 'complete':
        return (
          <CompleteStep
            data={data}
            onComplete={completeOnboarding}
            onBack={prevStep}
            saving={saving}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-ghost-bg flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-ghost-card/80 backdrop-blur-xl border-b border-ghost-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Ghost className="w-6 h-6 text-emerald-400" />
              <span className="font-display font-semibold text-white">GhostOps Setup</span>
            </div>
            <span className="text-sm text-ghost-muted">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
          <div className="flex gap-1">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  index < currentStep
                    ? 'bg-emerald-500'
                    : index === currentStep
                    ? 'bg-emerald-500/50'
                    : 'bg-ghost-border'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 pt-24 pb-8">
        <div className="w-full max-w-2xl">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}

// Step Components
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center animate-fade-in">
      <div className="relative inline-block mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-glow">
          <Ghost className="w-12 h-12 text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-400 rounded-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>

      <h1 className="text-4xl font-display font-bold text-white mb-4">
        Welcome to GhostOps
      </h1>
      <p className="text-xl text-ghost-muted mb-8 max-w-md mx-auto">
        Let's set up your AI employee in just a few minutes. It'll handle customer messages, invoicing, and more.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
        {[
          { icon: Phone, label: 'Auto-respond to customers' },
          { icon: Clock, label: 'Works 24/7 for you' },
          { icon: Sparkles, label: 'Learns your style' },
        ].map((feature, i) => (
          <div
            key={i}
            className="p-4 bg-ghost-card/50 rounded-xl border border-ghost-border animate-fade-in-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <feature.icon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-ghost-muted">{feature.label}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-glow hover:shadow-glow-strong"
      >
        Get Started
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

function BusinessStep({
  data,
  updateData,
  onNext,
  onBack,
}: {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const canContinue = data.businessType && data.businessName && data.ownerName

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-display font-bold text-white mb-2 text-center">
        Tell us about your business
      </h2>
      <p className="text-ghost-muted text-center mb-8">
        This helps your AI employee communicate in the right way
      </p>

      {/* Business Type Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-ghost-muted mb-3">
          What type of business do you run?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {BUSINESS_TYPES.map((type) => {
            const isSelected = data.businessType === type.id
            return (
              <button
                key={type.id}
                onClick={() => updateData({ businessType: type.id, services: [] })}
                className={`p-4 rounded-xl border transition-all duration-200 text-center ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-ghost-card border-ghost-border text-ghost-muted hover:border-ghost-border-subtle hover:text-white'
                }`}
              >
                <type.icon className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Business Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-ghost-muted mb-2">
          Business Name
        </label>
        <input
          type="text"
          value={data.businessName}
          onChange={(e) => updateData({ businessName: e.target.value })}
          placeholder="Acme Plumbing Co"
          className="w-full px-4 py-3 bg-ghost-card border border-ghost-border rounded-xl text-white placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Owner Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-ghost-muted mb-2">
          Your Name
        </label>
        <input
          type="text"
          value={data.ownerName}
          onChange={(e) => updateData({ ownerName: e.target.value })}
          placeholder="John Smith"
          className="w-full px-4 py-3 bg-ghost-card border border-ghost-border rounded-xl text-white placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Phone */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-ghost-muted mb-2">
          Business Phone (optional)
        </label>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => updateData({ phone: e.target.value })}
          placeholder="+1 (555) 123-4567"
          className="w-full px-4 py-3 bg-ghost-card border border-ghost-border rounded-xl text-white placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 text-ghost-muted hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

function ServicesStep({
  data,
  updateData,
  onNext,
  onBack,
}: {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const suggestions = SERVICE_SUGGESTIONS[data.businessType] || SERVICE_SUGGESTIONS.other
  const [customService, setCustomService] = useState('')

  const toggleService = (service: string) => {
    const current = data.services
    if (current.includes(service)) {
      updateData({ services: current.filter(s => s !== service) })
    } else {
      updateData({ services: [...current, service] })
    }
  }

  const addCustomService = () => {
    if (customService.trim() && !data.services.includes(customService.trim())) {
      updateData({ services: [...data.services, customService.trim()] })
      setCustomService('')
    }
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-display font-bold text-white mb-2 text-center">
        What services do you offer?
      </h2>
      <p className="text-ghost-muted text-center mb-8">
        Select the services your business provides
      </p>

      {/* Service Suggestions */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-ghost-muted mb-3">
          Suggested services for {data.businessType}
        </label>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((service) => {
            const isSelected = data.services.includes(service)
            return (
              <button
                key={service}
                onClick={() => toggleService(service)}
                className={`px-4 py-2 rounded-full border transition-all duration-200 text-sm ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-ghost-card border-ghost-border text-ghost-muted hover:border-ghost-border-subtle hover:text-white'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                {service}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom Service */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-ghost-muted mb-2">
          Add custom service
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customService}
            onChange={(e) => setCustomService(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomService()}
            placeholder="Enter a service..."
            className="flex-1 px-4 py-3 bg-ghost-card border border-ghost-border rounded-xl text-white placeholder:text-ghost-muted focus:outline-none focus:border-emerald-500/50"
          />
          <button
            onClick={addCustomService}
            disabled={!customService.trim()}
            className="px-4 py-3 bg-ghost-border text-white rounded-xl hover:bg-ghost-border-subtle transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Selected Services */}
      {data.services.length > 0 && (
        <div className="mb-8 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <p className="text-sm text-emerald-400 mb-2">Selected services ({data.services.length})</p>
          <div className="flex flex-wrap gap-2">
            {data.services.map((service) => (
              <span key={service} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                {service}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 text-ghost-muted hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-colors"
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

function HoursStep({
  data,
  updateData,
  onNext,
  onBack,
}: {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const days = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
  ]

  const updateHours = (day: string, field: string, value: string | boolean) => {
    updateData({
      businessHours: {
        ...data.businessHours,
        [day]: {
          ...data.businessHours[day],
          [field]: value,
        },
      },
    })
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-display font-bold text-white mb-2 text-center">
        Set your business hours
      </h2>
      <p className="text-ghost-muted text-center mb-8">
        Your AI will know when to respond and when to take messages
      </p>

      <div className="space-y-3 mb-8">
        {days.map((day) => {
          const hours = data.businessHours[day.key]
          return (
            <div
              key={day.key}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                hours.closed
                  ? 'bg-ghost-card/30 border-ghost-border/50'
                  : 'bg-ghost-card border-ghost-border'
              }`}
            >
              <div className="w-24">
                <span className={`font-medium ${hours.closed ? 'text-ghost-muted' : 'text-white'}`}>
                  {day.label}
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hours.closed}
                  onChange={(e) => updateHours(day.key, 'closed', !e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${hours.closed ? 'bg-ghost-border' : 'bg-emerald-500'}`}>
                  <div className={`w-4 h-4 mt-1 rounded-full bg-white transition-transform ${hours.closed ? 'ml-1' : 'ml-5'}`} />
                </div>
              </label>

              {!hours.closed && (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={hours.open}
                    onChange={(e) => updateHours(day.key, 'open', e.target.value)}
                    className="px-3 py-2 bg-ghost-bg border border-ghost-border rounded-lg text-white text-sm"
                  />
                  <span className="text-ghost-muted">to</span>
                  <input
                    type="time"
                    value={hours.close}
                    onChange={(e) => updateHours(day.key, 'close', e.target.value)}
                    className="px-3 py-2 bg-ghost-bg border border-ghost-border rounded-lg text-white text-sm"
                  />
                </div>
              )}

              {hours.closed && (
                <span className="text-ghost-muted text-sm">Closed</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 text-ghost-muted hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-colors"
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

function AISettingsStep({
  data,
  updateData,
  onNext,
  onBack,
}: {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const personalities = [
    { id: 'friendly', label: 'Friendly & Warm', desc: 'Casual, approachable, uses emojis occasionally' },
    { id: 'professional', label: 'Professional', desc: 'Polished, formal, business-focused' },
    { id: 'casual', label: 'Casual & Fun', desc: 'Relaxed, conversational, personable' },
    { id: 'efficient', label: 'Efficient & Direct', desc: 'Quick, to-the-point, no fluff' },
  ]

  const voiceOptions = [
    { id: 'professional', label: 'Professional' },
    { id: 'friendly', label: 'Friendly' },
    { id: 'expert', label: 'Expert' },
    { id: 'helpful', label: 'Helpful' },
  ]

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-display font-bold text-white mb-2 text-center">
        Customize your AI
      </h2>
      <p className="text-ghost-muted text-center mb-8">
        Set how your AI employee communicates with customers
      </p>

      {/* AI Personality */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-ghost-muted mb-3">
          AI Personality
        </label>
        <div className="grid grid-cols-2 gap-3">
          {personalities.map((p) => {
            const isSelected = data.aiPersonality === p.id
            return (
              <button
                key={p.id}
                onClick={() => updateData({ aiPersonality: p.id })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/50'
                    : 'bg-ghost-card border-ghost-border hover:border-ghost-border-subtle'
                }`}
              >
                <span className={`font-medium ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                  {p.label}
                </span>
                <p className="text-xs text-ghost-muted mt-1">{p.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Brand Voice */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-ghost-muted mb-3">
          Brand Voice
        </label>
        <div className="flex flex-wrap gap-2">
          {voiceOptions.map((v) => {
            const isSelected = data.brandVoice === v.id
            return (
              <button
                key={v.id}
                onClick={() => updateData({ brandVoice: v.id })}
                className={`px-4 py-2 rounded-full border transition-all ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-ghost-card border-ghost-border text-ghost-muted hover:text-white'
                }`}
              >
                {v.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="mb-8 p-4 bg-ghost-card/50 rounded-xl border border-ghost-border">
        <p className="text-xs text-ghost-muted mb-2">Sample AI Response</p>
        <p className="text-sm text-ghost-text">
          {data.aiPersonality === 'friendly' && "Hey there! 👋 Thanks for reaching out to " + (data.businessName || "us") + ". I'd be happy to help you out! What can I do for you today?"}
          {data.aiPersonality === 'professional' && "Thank you for contacting " + (data.businessName || "us") + ". I would be pleased to assist you with your inquiry. How may I help you today?"}
          {data.aiPersonality === 'casual' && "Hey! Thanks for hitting us up at " + (data.businessName || "our shop") + ". What's going on? How can we help?"}
          {data.aiPersonality === 'efficient' && "Thanks for contacting " + (data.businessName || "us") + ". How can I help?"}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 text-ghost-muted hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-colors"
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

function CompleteStep({
  data,
  onComplete,
  onBack,
  saving,
}: {
  data: OnboardingData
  onComplete: () => void
  onBack: () => void
  saving: boolean
}) {
  return (
    <div className="animate-fade-in text-center">
      <div className="relative inline-block mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-glow">
          <Check className="w-12 h-12 text-white" />
        </div>
      </div>

      <h2 className="text-3xl font-display font-bold text-white mb-4">
        You're all set!
      </h2>
      <p className="text-ghost-muted mb-8 max-w-md mx-auto">
        Your AI employee is ready to start helping with {data.businessName}.
      </p>

      {/* Summary */}
      <div className="bg-ghost-card rounded-xl border border-ghost-border p-6 mb-8 text-left max-w-md mx-auto">
        <h3 className="font-semibold text-white mb-4">Setup Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ghost-muted">Business</span>
            <span className="text-white">{data.businessName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ghost-muted">Type</span>
            <span className="text-white capitalize">{data.businessType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ghost-muted">Services</span>
            <span className="text-white">{data.services.length} selected</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ghost-muted">AI Personality</span>
            <span className="text-white capitalize">{data.aiPersonality}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <button
          onClick={onBack}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 text-ghost-muted hover:text-white transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-glow disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Launch Dashboard
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

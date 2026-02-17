'use client'

import { useState } from 'react'
import Script from 'next/script'
import {
  Ghost, Phone, MessageSquare, DollarSign, Star, Calendar,
  Zap, Clock, TrendingUp, CheckCircle, ArrowRight, Menu, X,
  Instagram, Facebook, PhoneCall, Send, Bot, Sparkles,
  Sun, Image, BarChart3, Loader2
} from 'lucide-react'

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'GhostOps',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any (SMS-based)',
  description: 'AI-powered SMS assistant that handles invoices, social media, missed call recovery, and business automation via text messages.',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '29',
    highPrice: '199',
    priceCurrency: 'USD',
    offerCount: '3',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '127',
    bestRating: '5',
    worstRating: '1',
  },
  featureList: [
    'SMS Invoicing with Stripe payments',
    'AI Social Media Management',
    'Missed Call Text-Back',
    'Morning Business Briefings',
    'Review Management',
    'Calendar Integration',
  ],
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const handleCheckout = async (plan: 'starter' | 'growth' | 'pro') => {
    setLoading(plan)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to start checkout. Please try again.')
        setLoading(null)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
      setLoading(null)
    }
  }

  return (
    <>
      {/* JSON-LD Structured Data - static content, safe to use */}
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-ghost-bg">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-ghost-bg/80 backdrop-blur-xl border-b border-ghost-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Ghost className="w-6 h-6 text-white" />
              </div>
              <span className="font-serif text-2xl text-white">GhostOps</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-ghost-muted hover:text-white transition">Features</a>
              <a href="#how-it-works" className="text-ghost-muted hover:text-white transition">How It Works</a>
              <a href="#pricing" className="text-ghost-muted hover:text-white transition">Pricing</a>
              <a href="#faq" className="text-ghost-muted hover:text-white transition">FAQ</a>
              <a
                href="https://dashboard-kappa-inky-19.vercel.app/login"
                className="text-ghost-muted hover:text-white transition"
              >
                Login
              </a>
              <button
                onClick={() => handleCheckout('growth')}
                className="btn-primary text-white px-6 py-2.5 rounded-full font-medium"
              >
                Get Started
              </button>
            </div>

            <button
              className="md:hidden p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-ghost-card/95 backdrop-blur-xl border-b border-ghost-border animate-fade-in">
              <div className="flex flex-col p-4 space-y-1">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-ghost-muted hover:text-white hover:bg-ghost-border/30 rounded-lg transition"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-ghost-muted hover:text-white hover:bg-ghost-border/30 rounded-lg transition"
                >
                  How It Works
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-ghost-muted hover:text-white hover:bg-ghost-border/30 rounded-lg transition"
                >
                  Pricing
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-ghost-muted hover:text-white hover:bg-ghost-border/30 rounded-lg transition"
                >
                  FAQ
                </a>
                <a
                  href="https://dashboard-kappa-inky-19.vercel.app/login"
                  className="px-4 py-3 text-ghost-muted hover:text-white hover:bg-ghost-border/30 rounded-lg transition"
                >
                  Login
                </a>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleCheckout('growth')
                    }}
                    className="w-full btn-primary text-white px-6 py-3 rounded-full font-medium"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/30 rounded-full px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">No App. No Download. Just Text.</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif text-white leading-tight mb-4 sm:mb-6">
                A Co-Founder<br />
                <span className="gradient-text">In Your Pocket</span>
              </h1>

              <p className="text-lg sm:text-xl text-ghost-muted mb-6 sm:mb-8 leading-relaxed">
                Run your entire business from text messages. Invoices, social media,
                missed call recovery — all via SMS. Your AI handles everything while you do the real work.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
                <button
                  onClick={() => handleCheckout('growth')}
                  className="bg-emerald-600 text-white px-6 sm:px-8 py-4 min-h-[52px] rounded-full font-semibold text-base sm:text-lg hover:bg-emerald-500 transition flex items-center justify-center gap-2 glow"
                >
                  Start Free Trial <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                  className="border border-ghost-border text-white px-6 sm:px-8 py-4 min-h-[52px] rounded-full font-semibold text-base sm:text-lg hover:bg-ghost-card transition"
                >
                  See It In Action
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                <div className="text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-white">0</div>
                  <div className="text-ghost-muted text-xs sm:text-sm">Apps to download</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-white">2 min</div>
                  <div className="text-ghost-muted text-xs sm:text-sm">Setup via text</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-white">24/7</div>
                  <div className="text-ghost-muted text-xs sm:text-sm">AI working for you</div>
                </div>
              </div>
            </div>

            {/* Right - Phone Mockup with Owner Commands */}
            <div className="relative flex justify-center animate-fade-in-up delay-200">
              <div className="phone-mockup w-[280px] sm:w-[300px] h-[580px] sm:h-[620px] relative lg:animate-float glow-subtle">
                <div className="bg-black rounded-[2rem] h-full overflow-hidden">
                  {/* Phone Header */}
                  <div className="bg-ghost-card px-4 py-3 flex items-center gap-3 border-b border-ghost-border">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                      <Ghost className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-medium">GhostOps</div>
                      <div className="text-emerald-400 text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Your AI Assistant
                      </div>
                    </div>
                  </div>

                  {/* Messages - Owner Commands */}
                  <div className="p-4 space-y-3 bg-ghost-bg h-full">
                    <div className="flex justify-end">
                      <div className="sms-bubble-out max-w-[80%]">
                        <p className="text-sm">what&apos;s my day look like</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="sms-bubble-in max-w-[85%]">
                        <p className="text-sm">You have 3 appointments:<br/>
                        9AM - Johnson kitchen estimate<br/>
                        1PM - Smith bathroom install<br/>
                        4PM - Follow-up call with Mike<br/><br/>
                        2 unpaid invoices ($1,200)<br/>
                        1 new Google review (5 stars)</p>
                        <div className="flex items-center gap-1 mt-1 opacity-70">
                          <Bot className="w-3 h-3" /><span className="text-xs">AI</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="sms-bubble-out max-w-[80%]">
                        <p className="text-sm">invoice sarah chen 2500 for bathroom remodel</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="sms-bubble-in max-w-[85%]">
                        <p className="text-sm">Done. Invoice sent to Sarah Chen for $2,500. She&apos;ll get a payment link via text. I&apos;ll remind her in 3 days if unpaid.</p>
                        <div className="flex items-center gap-1 mt-1 opacity-70">
                          <Bot className="w-3 h-3" /><span className="text-xs">AI</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="sms-bubble-out max-w-[80%]">
                        <p className="text-sm">post my latest kitchen photo to instagram</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="sms-bubble-in max-w-[85%]">
                        <p className="text-sm">Done! Posted to Instagram with caption: &quot;Another stunning kitchen transformation!&quot; Want me to cross-post to Facebook too?</p>
                        <div className="flex items-center gap-1 mt-1 opacity-70">
                          <Bot className="w-3 h-3" /><span className="text-xs">AI</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards - Hidden on mobile */}
              <div className="hidden lg:block absolute -left-10 top-20 bg-ghost-card border border-ghost-border rounded-xl p-4 shadow-xl animate-slide-in-left delay-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-600/20 rounded-lg flex items-center justify-center">
                    <Instagram className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">Post Scheduled</div>
                    <div className="text-pink-400 text-xs">Tomorrow 10AM</div>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block absolute -right-10 top-40 bg-ghost-card border border-ghost-border rounded-xl p-4 shadow-xl animate-slide-in-right delay-400">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">Payment Received</div>
                    <div className="text-green-400 text-xs">+$2,500.00</div>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block absolute -left-5 bottom-32 bg-ghost-card border border-ghost-border rounded-xl p-4 shadow-xl animate-slide-in-left delay-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center">
                    <PhoneCall className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">Missed Call Saved</div>
                    <div className="text-orange-400 text-xs">Lead texted back</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "No App" Section */}
      <section className="py-12 sm:py-16 border-y border-ghost-border bg-ghost-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            <div>
              <div className="text-4xl mb-2">📱</div>
              <div className="text-white font-medium">Works on any phone</div>
              <div className="text-ghost-muted text-sm">iPhone, Android, flip phone</div>
            </div>
            <div>
              <div className="text-4xl mb-2">🚫</div>
              <div className="text-white font-medium">No app to download</div>
              <div className="text-ghost-muted text-sm">Zero install friction</div>
            </div>
            <div>
              <div className="text-4xl mb-2">🔐</div>
              <div className="text-white font-medium">No login to remember</div>
              <div className="text-ghost-muted text-sm">Just text your number</div>
            </div>
            <div>
              <div className="text-4xl mb-2">♾️</div>
              <div className="text-white font-medium">No app to uninstall</div>
              <div className="text-ghost-muted text-sm">Zero churn friction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white mb-4">
              Everything You Need, <span className="gradient-text">One Text Away</span>
            </h2>
            <p className="text-xl text-ghost-muted max-w-2xl mx-auto">
              Text commands like you&apos;d text a human assistant.
              Your AI handles the rest.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Calendar,
                title: 'Calendar & Scheduling',
                description: '"What\'s my day" → see your schedule. Track appointments via text. Google Calendar sync coming soon.',
                color: 'text-blue-400',
                bg: 'bg-blue-600/20'
              },
              {
                icon: DollarSign,
                title: 'SMS Invoicing',
                description: '"Invoice John $500 for plumbing" → Stripe payment link texted to customer. Auto-reminders included.',
                color: 'text-green-400',
                bg: 'bg-green-600/20'
              },
              {
                icon: Image,
                title: 'AI Social Media Manager',
                description: 'Send a photo → AI generates posts for Instagram & Facebook. Approve via text. More platforms coming soon.',
                color: 'text-pink-400',
                bg: 'bg-pink-600/20'
              },
              {
                icon: PhoneCall,
                title: 'Missed Call Recovery',
                description: 'Missed call → AI texts back in 60 seconds, books the appointment. Never lose a lead.',
                color: 'text-orange-400',
                bg: 'bg-orange-600/20'
              },
              {
                icon: Sun,
                title: 'Morning Briefing',
                description: '7 AM daily text: appointments, unpaid invoices, new reviews, social stats. Start every day informed.',
                color: 'text-yellow-400',
                bg: 'bg-yellow-600/20'
              },
              {
                icon: BarChart3,
                title: 'Business Stats',
                description: '"How much did I make this month" → instant revenue report. Track everything via text.',
                color: 'text-cyan-400',
                bg: 'bg-cyan-600/20'
              },
              {
                icon: Star,
                title: 'Review Engine',
                description: '"Ask John for a review" → review request sent. AI responds to all Google reviews in your voice.',
                color: 'text-amber-400',
                bg: 'bg-amber-600/20'
              },
              {
                icon: Zap,
                title: 'Speed-to-Lead',
                description: 'New lead → AI responds in under 60 seconds. 391% more conversions than waiting.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-600/20'
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="feature-card p-6 animate-fade-in-up"
                style={{ animationDelay: `${i * 75}ms` }}
              >
                <div className={"w-14 h-14 rounded-xl flex items-center justify-center mb-4 " + feature.bg}>
                  <feature.icon className={"w-7 h-7 " + feature.color} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-ghost-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Media Deep Dive */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-ghost-card">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-pink-600/10 border border-pink-600/30 rounded-full px-4 py-2 mb-6">
                <Instagram className="w-4 h-4 text-pink-400" />
                <span className="text-pink-400 text-sm font-medium">AI Social Media Manager</span>
              </div>

              <h2 className="text-4xl font-serif text-white mb-6">
                Send a Photo.<br />
                <span className="gradient-text">AI Does the Rest.</span>
              </h2>

              <p className="text-xl text-ghost-muted mb-8">
                Text a photo of your work. AI generates platform-perfect posts for
                Instagram and Facebook — with the right format, hashtags, and tone for each.
              </p>

              <div className="space-y-4">
                {[
                  { platform: 'Instagram', desc: 'Square crops, trending hashtags, Reels-ready captions' },
                  { platform: 'Facebook', desc: 'Community-focused, shareable, engagement-optimized' },
                  { platform: 'LinkedIn', desc: 'Coming soon — professional tone, industry hashtags', comingSoon: true },
                  { platform: 'TikTok', desc: 'Coming soon — hook-driven, trendy, vertical video scripts', comingSoon: true },
                  { platform: 'YouTube', desc: 'Coming soon — title, description, tags, timestamps', comingSoon: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {item.comingSoon ? (
                      <Clock className="w-5 h-5 text-ghost-muted mt-0.5" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                    )}
                    <div>
                      <span className={item.comingSoon ? "text-ghost-muted font-medium" : "text-white font-medium"}>{item.platform}:</span>
                      <span className="text-ghost-muted"> {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-ghost-bg border border-ghost-border rounded-2xl p-6">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="sms-bubble-out max-w-[80%]">
                    <div className="rounded-lg h-32 w-full mb-2 overflow-hidden">
                      <img
                        src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&q=80"
                        alt="Modern kitchen renovation"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm">post this to instagram</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="sms-bubble-in max-w-[85%]">
                    <p className="text-sm">Got it! Here&apos;s what I&apos;d post:</p>
                    <p className="text-sm mt-2 italic">&quot;Another kitchen transformation complete! From dated to modern in just 5 days. Swipe to see the before 👉 #KitchenRemodel #HomeRenovation #BeforeAndAfter&quot;</p>
                    <p className="text-sm mt-2">Reply:<br/>
                    • &quot;post now&quot; to publish<br/>
                    • &quot;schedule tomorrow 10am&quot;<br/>
                    • &quot;try another caption&quot;</p>
                    <div className="flex items-center gap-1 mt-2 opacity-70">
                      <Bot className="w-3 h-3" /><span className="text-xs">AI</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="sms-bubble-out max-w-[80%]">
                    <p className="text-sm">schedule tomorrow 10am</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="sms-bubble-in max-w-[85%]">
                    <p className="text-sm">Scheduled for tomorrow 10AM on Instagram + Facebook. I&apos;ll text you when it goes live.</p>
                    <div className="flex items-center gap-1 mt-1 opacity-70">
                      <Bot className="w-3 h-3" /><span className="text-xs">AI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white mb-4">
              Set Up in <span className="gradient-text">2 Minutes</span>
            </h2>
            <p className="text-lg sm:text-xl text-ghost-muted">All via text. No calls. No forms. No app.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                step: '01',
                title: 'Sign Up',
                description: 'Enter your phone number and payment. Takes 60 seconds.'
              },
              {
                step: '02',
                title: 'Get Your Number',
                description: 'We instantly text you your new AI business number.'
              },
              {
                step: '03',
                title: 'Save & Text',
                description: 'Save it as "GhostOps AI" and start texting commands.'
              },
              {
                step: '04',
                title: 'AI Works 24/7',
                description: 'Handle customers, invoices, calendar, social — all via text.'
              },
            ].map((item, i) => (
              <div
                key={i}
                className="text-center animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-5xl font-serif gradient-text mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-ghost-muted">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Example Onboarding */}
          <div className="mt-16 max-w-md mx-auto bg-ghost-card border border-ghost-border rounded-2xl p-6">
            <div className="text-center text-ghost-muted text-sm mb-4">What happens after signup</div>
            <div className="space-y-3">
              <div className="flex justify-start">
                <div className="sms-bubble-in max-w-[85%]">
                  <p className="text-sm">Welcome to GhostOps! Your AI assistant number is: +1 (555) 123-4567<br/><br/>Save this number and text it anytime!</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="sms-bubble-out max-w-[80%]">
                  <p className="text-sm">what&apos;s my day look like</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="sms-bubble-in max-w-[85%]">
                  <p className="text-sm">You have 3 appointments today:<br/>9AM - Johnson kitchen estimate<br/>1PM - Smith bathroom install<br/>4PM - Call with Mike<br/><br/>2 unpaid invoices ($1,200)</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="sms-bubble-out max-w-[80%]">
                  <p className="text-sm">remind them to pay</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="sms-bubble-in max-w-[85%]">
                  <p className="text-sm">Done! Sent friendly payment reminders to Sarah Chen ($750) and Mike Johnson ($450).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-ghost-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white mb-4">
              Simple, <span className="gradient-text">Transparent Pricing</span>
            </h2>
            <p className="text-lg sm:text-xl text-ghost-muted">Less than a part-time employee. Works 24/7.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-ghost-bg border border-ghost-border rounded-2xl p-8">
              <div className="text-ghost-muted font-medium mb-2">Starter</div>
              <div className="text-4xl font-bold text-white mb-1">$29<span className="text-lg text-ghost-muted">/mo</span></div>
              <p className="text-ghost-muted text-sm mb-6">For solo operators</p>
              <ul className="space-y-3 mb-8">
                {[
                  '100 SMS messages/mo',
                  '50 AI conversations/mo',
                  'SMS invoicing (10/mo)',
                  'Morning briefing',
                  '1 phone number',
                  '250 contacts'
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-white">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout('starter')}
                disabled={loading === 'starter'}
                className="w-full border border-ghost-border text-white py-4 min-h-[52px] rounded-full font-medium hover:bg-ghost-border transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === 'starter' ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Start Free Trial
              </button>
            </div>

            {/* Growth - Featured */}
            <div className="gradient-border p-8 relative glow">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <div className="text-emerald-400 font-medium mb-2">Growth</div>
              <div className="text-4xl font-bold text-white mb-1">$79<span className="text-lg text-ghost-muted">/mo</span></div>
              <p className="text-ghost-muted text-sm mb-6">For active businesses</p>
              <ul className="space-y-3 mb-8">
                {[
                  '500 SMS messages/mo',
                  '200 AI conversations/mo',
                  'Unlimited invoicing',
                  'AI Social Media (IG + FB)',
                  'Weekly strategy reports',
                  '2 phone numbers',
                  '2,500 contacts'
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-white">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout('growth')}
                disabled={loading === 'growth'}
                className="w-full bg-emerald-600 text-white py-4 min-h-[52px] rounded-full font-medium hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === 'growth' ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Start Free Trial
              </button>
            </div>

            {/* Pro */}
            <div className="bg-ghost-bg border border-ghost-border rounded-2xl p-8">
              <div className="text-ghost-muted font-medium mb-2">Pro</div>
              <div className="text-4xl font-bold text-white mb-1">$199<span className="text-lg text-ghost-muted">/mo</span></div>
              <p className="text-ghost-muted text-sm mb-6">For high-volume teams</p>
              <ul className="space-y-3 mb-8">
                {[
                  '2,000 SMS messages/mo',
                  'Unlimited AI conversations',
                  'Full AI automation',
                  'Monthly strategy review',
                  '5 phone numbers',
                  'Unlimited contacts',
                  'API access',
                  'Priority support'
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-white">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout('pro')}
                disabled={loading === 'pro'}
                className="w-full border border-ghost-border text-white py-4 min-h-[52px] rounded-full font-medium hover:bg-ghost-border transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === 'pro' ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Start Free Trial
              </button>
            </div>
          </div>

          {/* Enterprise CTA */}
          <div className="mt-12 text-center">
            <p className="text-ghost-muted mb-3">Need multi-location, white-label, or custom integrations?</p>
            <a href="mailto:enterprise@ghostops.ai" className="text-emerald-400 hover:text-emerald-300 font-medium transition">
              Contact us for Enterprise pricing →
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white mb-4">
              Like Having a <span className="gradient-text">24/7 Business Partner</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                quote: "I texted 'what's my day' this morning and got my entire schedule, unpaid invoices, and a heads up about a 5-star review. All before coffee.",
                name: "David Chen",
                role: "Chen's Remodeling",
                rating: 5
              },
              {
                quote: "Sent a photo of a finished kitchen at 9pm. By 9:05 I was approving an Instagram post. This thing is insane.",
                name: "Maria Santos",
                role: "Santos Design Co",
                rating: 5
              },
              {
                quote: "My ghost recovered a $12K job from a missed call while I was on another job site. It booked the estimate before I even saw the notification.",
                name: "James Thompson",
                role: "Thompson Plumbing",
                rating: 5
              },
            ].map((t, i) => (
              <div
                key={i}
                className="testimonial-card animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {Array(t.rating).fill(0).map((_, j) => (
                    <Star key={j} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-white mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="font-medium text-white">{t.name}</div>
                  <div className="text-ghost-muted text-sm">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 bg-ghost-card">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Do I really not need to download anything?",
                a: "Correct. GhostOps works 100% via SMS. You text commands to your GhostOps number, it texts back. Works on any phone — iPhone, Android, even flip phones. We offer an optional web dashboard for analytics, but it's not required."
              },
              {
                q: "How does the 2-minute setup work?",
                a: "You text your GhostOps number. It asks your business name, email, and industry. That's it. No forms, no calls, no app downloads. Google Calendar sync is coming soon."
              },
              {
                q: "What if I need to do something the AI can't handle?",
                a: "The AI knows its limits. It'll say 'I can't do that, but here's what I'd suggest' or escalate to you with full context. You can always text 'pause' to handle things personally, then 'resume' when ready."
              },
              {
                q: "How does social media posting work?",
                a: "Text or MMS a photo to your GhostOps number. AI generates platform-specific posts for Instagram and Facebook — with proper formatting, hashtags, and tone for each. You approve or edit via text, then it posts. LinkedIn, TikTok, and YouTube support coming soon."
              },
              {
                q: "Is my data secure?",
                a: "Your data is encrypted and stored on Supabase (PostgreSQL with row-level security). We never share or sell your data. You can export or delete everything anytime. All API communications are encrypted via HTTPS."
              },
            ].map((item, i) => (
              <div key={i} className="bg-ghost-bg border border-ghost-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-ghost-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white mb-4 sm:mb-6">
            Ready for a Co-Founder That Never Sleeps?
          </h2>
          <p className="text-lg sm:text-xl text-ghost-muted mb-6 sm:mb-8">
            Start your 14-day free trial. Set up in 2 minutes via text.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-ghost-card border border-ghost-border rounded-full px-5 sm:px-6 py-4 min-h-[52px] text-white placeholder-ghost-muted focus:outline-none focus:border-emerald-600"
            />
            <button
              onClick={() => handleCheckout('growth')}
              disabled={!!loading}
              className="bg-emerald-600 text-white px-6 sm:px-8 py-4 min-h-[52px] rounded-full font-semibold hover:bg-emerald-500 transition whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Get Started
            </button>
          </div>

          <p className="text-ghost-muted text-sm mt-4">No credit card required. No app to download.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 sm:py-12 px-4 sm:px-6 border-t border-ghost-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Ghost className="w-6 h-6 text-white" />
              </div>
              <span className="font-serif text-xl text-white">GhostOps</span>
            </div>

            <div className="flex gap-6 sm:gap-8 text-ghost-muted">
              <a href="/privacy" className="hover:text-white transition py-2 min-h-[44px] flex items-center">Privacy</a>
              <a href="/terms" className="hover:text-white transition py-2 min-h-[44px] flex items-center">Terms</a>
              <a href="mailto:support@ghostops.ai" className="hover:text-white transition py-2 min-h-[44px] flex items-center">Contact</a>
            </div>

            <div className="text-ghost-muted text-sm">
              &copy; 2026 GhostOps. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}

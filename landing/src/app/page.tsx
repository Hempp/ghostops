'use client'

import { useState } from 'react'
import {
  Ghost, Phone, MessageSquare, DollarSign, Star, Calendar,
  Zap, Clock, TrendingUp, CheckCircle, ArrowRight, Menu, X,
  Instagram, Facebook, Mail, PhoneCall, Send, Bot, Sparkles,
  Linkedin, Youtube, Sun, Image, BarChart3
} from 'lucide-react'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [email, setEmail] = useState('')

  return (
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
              <button className="bg-emerald-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-emerald-500 transition">
                Get Started
              </button>
            </div>

            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/30 rounded-full px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">No App. No Download. Just Text.</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-serif text-white leading-tight mb-6">
                A Co-Founder<br />
                <span className="gradient-text">In Your Pocket</span>
              </h1>

              <p className="text-xl text-ghost-muted mb-8 leading-relaxed">
                Run your entire business from text messages. Calendar, email, invoices,
                social media — all via SMS. Your AI handles everything while you do the real work.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <button className="bg-emerald-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-emerald-500 transition flex items-center justify-center gap-2 glow">
                  Start Free Trial <ArrowRight className="w-5 h-5" />
                </button>
                <button className="border border-ghost-border text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-ghost-card transition">
                  See It In Action
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-white">0</div>
                  <div className="text-ghost-muted text-sm">Apps to download</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">2 min</div>
                  <div className="text-ghost-muted text-sm">Setup via text</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">24/7</div>
                  <div className="text-ghost-muted text-sm">AI working for you</div>
                </div>
              </div>
            </div>

            {/* Right - Phone Mockup with Owner Commands */}
            <div className="relative flex justify-center">
              <div className="phone-mockup w-[300px] h-[620px] relative animate-float">
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
                        <p className="text-sm">email my accountant last month&apos;s invoices</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="sms-bubble-in max-w-[85%]">
                        <p className="text-sm">Sent. 14 invoices totaling $18,400 attached as PDF to mike@accounting.com</p>
                        <div className="flex items-center gap-1 mt-1 opacity-70">
                          <Bot className="w-3 h-3" /><span className="text-xs">AI</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -left-10 top-20 bg-ghost-card border border-ghost-border rounded-xl p-4 shadow-xl">
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

              <div className="absolute -right-10 top-40 bg-ghost-card border border-ghost-border rounded-xl p-4 shadow-xl">
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

              <div className="absolute -left-5 bottom-32 bg-ghost-card border border-ghost-border rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">Email Sent</div>
                    <div className="text-purple-400 text-xs">To accountant</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "No App" Section */}
      <section className="py-16 border-y border-ghost-border bg-ghost-card/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center">
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
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4">
              Everything You Need, <span className="gradient-text">One Text Away</span>
            </h2>
            <p className="text-xl text-ghost-muted max-w-2xl mx-auto">
              Text commands like you&apos;d text a human assistant.
              Your AI handles the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Calendar,
                title: 'Calendar & Scheduling',
                description: '"What\'s my day" → see your schedule. "Add meeting Monday 2pm" → done. Syncs with Google Calendar.',
                color: 'text-blue-400',
                bg: 'bg-blue-600/20'
              },
              {
                icon: Mail,
                title: 'Email Management',
                description: '"What did Sarah email me" → summary. "Email her back about the timeline" → sent. Full Gmail integration.',
                color: 'text-purple-400',
                bg: 'bg-purple-600/20'
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
                description: 'Send a photo → AI generates posts for IG, FB, LinkedIn, TikTok, YouTube. Approve via text.',
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
              <div key={i} className="gradient-border p-6">
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
      <section className="py-24 px-6 bg-ghost-card">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
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
                Instagram, Facebook, LinkedIn, TikTok, and YouTube — with the right
                format, hashtags, and tone for each.
              </p>

              <div className="space-y-4">
                {[
                  { platform: 'Instagram', desc: 'Square crops, trending hashtags, Reels-ready captions' },
                  { platform: 'Facebook', desc: 'Community-focused, shareable, engagement-optimized' },
                  { platform: 'LinkedIn', desc: 'Professional tone, industry hashtags, thought leadership' },
                  { platform: 'TikTok', desc: 'Hook-driven, trendy, vertical video scripts' },
                  { platform: 'YouTube', desc: 'Full package: title, description, tags, timestamps' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div>
                      <span className="text-white font-medium">{item.platform}:</span>
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
                    <div className="bg-ghost-border rounded-lg h-32 w-full mb-2 flex items-center justify-center">
                      <Image className="w-8 h-8 text-ghost-muted" />
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
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4">
              Set Up in <span className="gradient-text">2 Minutes</span>
            </h2>
            <p className="text-xl text-ghost-muted">All via text. No calls. No forms. No app.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Text Your Number',
                description: 'We give you a dedicated phone number. Text it to start setup.'
              },
              {
                step: '02',
                title: 'Answer 3 Questions',
                description: 'Business name, email, industry. All via text. Takes 30 seconds.'
              },
              {
                step: '03',
                title: 'Connect Google',
                description: 'One tap to link your calendar and email. Optional but powerful.'
              },
              {
                step: '04',
                title: 'You\'re Live',
                description: 'AI starts working immediately. Text commands anytime.'
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-serif gradient-text mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-ghost-muted">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Example Onboarding */}
          <div className="mt-16 max-w-md mx-auto bg-ghost-card border border-ghost-border rounded-2xl p-6">
            <div className="text-center text-ghost-muted text-sm mb-4">Example setup conversation</div>
            <div className="space-y-3">
              <div className="flex justify-start">
                <div className="sms-bubble-in max-w-[85%]">
                  <p className="text-sm">Hey! I&apos;m your GhostOps AI. What&apos;s your business name?</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="sms-bubble-out max-w-[80%]">
                  <p className="text-sm">Chen&apos;s Home Remodeling</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="sms-bubble-in max-w-[85%]">
                  <p className="text-sm">Got it! Tap here to connect Google Calendar: [link]</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="sms-bubble-out max-w-[80%]">
                  <p className="text-sm">done</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="sms-bubble-in max-w-[85%]">
                  <p className="text-sm">You&apos;re live! I&apos;m working for you 24/7 now. Text me anytime like you&apos;d text an employee. 👻</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-ghost-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4">
              Simple, <span className="gradient-text">Transparent Pricing</span>
            </h2>
            <p className="text-xl text-ghost-muted">Less than a part-time employee. Works 24/7.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-ghost-bg border border-ghost-border rounded-2xl p-8">
              <div className="text-ghost-muted font-medium mb-2">Starter</div>
              <div className="text-4xl font-bold text-white mb-1">$79<span className="text-lg text-ghost-muted">/mo</span></div>
              <p className="text-ghost-muted text-sm mb-6">For solo operators</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Missed call text-back',
                  'SMS invoicing',
                  'Morning briefing',
                  'Basic stats via text',
                  '500 AI messages/mo'
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-white">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
              <button className="w-full border border-ghost-border text-white py-3 rounded-full font-medium hover:bg-ghost-border transition">
                Start Free Trial
              </button>
            </div>

            {/* Pro - Featured */}
            <div className="gradient-border p-8 relative glow">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <div className="text-emerald-400 font-medium mb-2">Pro</div>
              <div className="text-4xl font-bold text-white mb-1">$197<span className="text-lg text-ghost-muted">/mo</span></div>
              <p className="text-ghost-muted text-sm mb-6">Full co-founder mode</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Starter',
                  'Google Calendar sync',
                  'Gmail read/send',
                  'AI Social Media Manager',
                  'Review engine',
                  'Unlimited AI messages',
                  'Web dashboard'
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-white">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
              <button className="w-full bg-emerald-600 text-white py-3 rounded-full font-medium hover:bg-emerald-500 transition">
                Start Free Trial
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-ghost-bg border border-ghost-border rounded-2xl p-8">
              <div className="text-ghost-muted font-medium mb-2">Agency</div>
              <div className="text-4xl font-bold text-white mb-1">$499<span className="text-lg text-ghost-muted">/mo</span></div>
              <p className="text-ghost-muted text-sm mb-6">Multi-location & teams</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Pro',
                  'Up to 5 locations',
                  'Team member access',
                  'White-label option',
                  'API access',
                  'Priority support'
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-white">
                    <CheckCircle className="w-5 h-5 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
              <button className="w-full border border-ghost-border text-white py-3 rounded-full font-medium hover:bg-ghost-border transition">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4">
              Like Having a <span className="gradient-text">24/7 Business Partner</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
              <div key={i} className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
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
      <section id="faq" className="py-24 px-6 bg-ghost-card">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4">
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
                a: "You text your GhostOps number. It asks your business name, email, and industry. You tap one link to connect Google Calendar (optional). That's it. No forms, no calls, no app downloads."
              },
              {
                q: "What if I need to do something the AI can't handle?",
                a: "The AI knows its limits. It'll say 'I can't do that, but here's what I'd suggest' or escalate to you with full context. You can always text 'pause' to handle things personally, then 'resume' when ready."
              },
              {
                q: "How does social media posting work?",
                a: "Text or MMS a photo to your GhostOps number. AI generates platform-specific posts for Instagram, Facebook, LinkedIn, TikTok, or YouTube — with proper formatting, hashtags, and tone for each. You approve or edit via text, then it posts."
              },
              {
                q: "Can it really manage my email?",
                a: "Yes. 'What did John email me about' gives you a summary. 'Email him back saying the tile arrives Friday' drafts and sends it. Full Gmail integration. You stay in control — it shows you what it's sending."
              },
              {
                q: "Is my data secure?",
                a: "Your data is encrypted and stored on Firebase (Google Cloud). We never share or sell your data. You can export or delete everything anytime. We're SOC2 compliant."
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
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-4xl lg:text-5xl font-serif text-white mb-6">
            Ready for a Co-Founder That Never Sleeps?
          </h2>
          <p className="text-xl text-ghost-muted mb-8">
            Start your 14-day free trial. Set up in 2 minutes via text.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-ghost-card border border-ghost-border rounded-full px-6 py-4 text-white placeholder-ghost-muted focus:outline-none focus:border-emerald-600"
            />
            <button className="bg-emerald-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-emerald-500 transition whitespace-nowrap">
              Get Started
            </button>
          </div>

          <p className="text-ghost-muted text-sm mt-4">No credit card required. No app to download.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-ghost-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Ghost className="w-6 h-6 text-white" />
              </div>
              <span className="font-serif text-xl text-white">GhostOps</span>
            </div>

            <div className="flex gap-8 text-ghost-muted">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Terms</a>
              <a href="#" className="hover:text-white transition">Contact</a>
            </div>

            <div className="text-ghost-muted text-sm">
              &copy; 2025 GhostOps. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

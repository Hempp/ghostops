'use client'

import { useState } from 'react'
import { 
  Ghost, Phone, MessageSquare, DollarSign, Star, Calendar, 
  Zap, Clock, TrendingUp, CheckCircle, ArrowRight, Menu, X,
  Instagram, Facebook, Mail, PhoneCall, Send, Bot, Sparkles
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
                <span className="text-emerald-400 text-sm font-medium">AI-Powered SMS Automation</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-serif text-white leading-tight mb-6">
                Your AI Employee<br />
                <span className="gradient-text">That Never Sleeps</span>
              </h1>
              
              <p className="text-xl text-ghost-muted mb-8 leading-relaxed">
                Run your entire business from text messages. GhostOps handles leads, 
                books appointments, sends invoices, and manages social media — 
                all via SMS. Zero app needed.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <button className="bg-emerald-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-emerald-500 transition flex items-center justify-center gap-2 glow">
                  Start Free Trial <ArrowRight className="w-5 h-5" />
                </button>
                <button className="border border-ghost-border text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-ghost-card transition">
                  Watch Demo
                </button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-white">391%</div>
                  <div className="text-ghost-muted text-sm">More conversions with 60s response</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">$126K</div>
                  <div className="text-ghost-muted text-sm">Avg revenue saved per year</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">24/7</div>
                  <div className="text-ghost-muted text-sm">Always-on automation</div>
                </div>
              </div>
            </div>
            
            {/* Right - Phone Mockup */}
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
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Active
                      </div>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <div className="p-4 space-y-3 bg-ghost-bg h-full">
                    <div className="flex justify-start">
                      <div className="sms-bubble-in max-w-[80%]">
                        <p className="text-sm">Hi, I saw your ad. Do you do kitchen renovations?</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="sms-bubble-out max-w-[80%]">
                        <p className="text-sm">Hi! Yes, we specialize in kitchen renovations. What kind of project are you looking at?</p>
                        <div className="flex items-center gap-1 mt-1 opacity-70">
                          <Bot className="w-3 h-3" /><span className="text-xs">AI</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="sms-bubble-in max-w-[80%]">
                        <p className="text-sm">Complete remodel. Cabinets, counters, backsplash</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="sms-bubble-out max-w-[80%]">
                        <p className="text-sm">Perfect! Want to schedule a free estimate? We have availability this week.</p>
                        <div className="flex items-center gap-1 mt-1 opacity-70">
                          <Bot className="w-3 h-3" /><span className="text-xs">AI</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="sms-bubble-in max-w-[80%]">
                        <p className="text-sm">Yes! Tomorrow at 2pm works</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="sms-bubble-out max-w-[80%]">
                        <p className="text-sm">Booked for tomorrow at 2pm. See you then!</p>
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
                  <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Payment Received</div>
                    <div className="text-green-400 text-sm">+$450.00</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -right-10 top-40 bg-ghost-card border border-ghost-border rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">New Review</div>
                    <div className="text-yellow-400 text-sm">5 stars</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -left-5 bottom-32 bg-ghost-card border border-ghost-border rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <PhoneCall className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Missed Call Recovered</div>
                    <div className="text-blue-400 text-sm">Appointment booked</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-12 border-y border-ghost-border">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-ghost-muted mb-8">Powered by industry leaders</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
            <div className="text-2xl font-bold text-white">Twilio</div>
            <div className="text-2xl font-bold text-white">Claude AI</div>
            <div className="text-2xl font-bold text-white">Stripe</div>
            <div className="text-2xl font-bold text-white">Supabase</div>
            <div className="text-2xl font-bold text-white">Meta</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4">
              7 Powerful Features, <span className="gradient-text">One Text Away</span>
            </h2>
            <p className="text-xl text-ghost-muted max-w-2xl mx-auto">
              Everything your business needs to automate customer communication, 
              all controlled from your phone via SMS.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: PhoneCall,
                title: 'Missed Call Text-Back',
                description: 'Never lose a lead again. Missed calls trigger instant AI text that books appointments.',
                color: 'text-blue-400',
                bg: 'bg-blue-600/20'
              },
              {
                icon: Zap,
                title: 'Speed-to-Lead',
                description: 'Respond to new leads in under 60 seconds. 391% more conversions guaranteed.',
                color: 'text-yellow-400',
                bg: 'bg-yellow-600/20'
              },
              {
                icon: Star,
                title: 'Review Engine',
                description: 'Auto-request Google reviews after jobs. AI responds to all reviews in your voice.',
                color: 'text-orange-400',
                bg: 'bg-orange-600/20'
              },
              {
                icon: DollarSign,
                title: 'SMS Invoicing',
                description: 'Text "invoice John 500 plumbing" and your customer gets a Stripe payment link.',
                color: 'text-green-400',
                bg: 'bg-green-600/20'
              },
              {
                icon: Instagram,
                title: 'Social Media Engine',
                description: 'Send a photo via MMS, AI generates captions, approve and post to IG/FB.',
                color: 'text-pink-400',
                bg: 'bg-pink-600/20'
              },
              {
                icon: Calendar,
                title: 'Morning Briefing',
                description: 'Daily SMS with leads, reviews, revenue, appointments, and overdue invoices.',
                color: 'text-purple-400',
                bg: 'bg-purple-600/20'
              },
              {
                icon: MessageSquare,
                title: 'Owner Commands',
                description: 'Control everything via text: pause, status, invoice, post, unpaid, help.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-600/20',
                span: true
              },
            ].map((feature, i) => (
              <div 
                key={i} 
                className={"gradient-border p-6 " + (feature.span ? "md:col-span-2 lg:col-span-1" : "")}
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

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-ghost-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4">
              Set Up in <span className="gradient-text">5 Minutes</span>
            </h2>
            <p className="text-xl text-ghost-muted">No apps to download. No complex setup. Just text.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Get Your Number',
                description: 'We provision a dedicated local phone number for your business.'
              },
              {
                step: '02',
                title: 'Tell Us About Your Business',
                description: 'Quick onboarding call to capture your services, hours, and brand voice.'
              },
              {
                step: '03',
                title: 'Your Ghost Goes to Work',
                description: 'AI starts handling calls, leads, reviews, and invoices immediately.'
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-6xl font-serif gradient-text mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-ghost-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4">
              Simple, <span className="gradient-text">Transparent Pricing</span>
            </h2>
            <p className="text-xl text-ghost-muted">No hidden fees. Cancel anytime.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <div className="text-ghost-muted font-medium mb-2">Starter</div>
              <div className="text-4xl font-bold text-white mb-1">$97<span className="text-lg text-ghost-muted">/mo</span></div>
              <p className="text-ghost-muted text-sm mb-6">Perfect for solo operators</p>
              <ul className="space-y-3 mb-8">
                {['Missed call text-back', 'Speed-to-lead (50/mo)', 'SMS invoicing', 'Morning briefing', '500 AI messages/mo'].map((f, i) => (
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
              <p className="text-ghost-muted text-sm mb-6">For growing businesses</p>
              <ul className="space-y-3 mb-8">
                {['Everything in Starter', 'Review engine', 'Social media posting', 'Unlimited AI messages', 'Priority support', 'Dashboard access'].map((f, i) => (
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
            <div className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <div className="text-ghost-muted font-medium mb-2">Enterprise</div>
              <div className="text-4xl font-bold text-white mb-1">Custom</div>
              <p className="text-ghost-muted text-sm mb-6">For agencies & multi-location</p>
              <ul className="space-y-3 mb-8">
                {['Everything in Pro', 'Multiple locations', 'White-label option', 'API access', 'Dedicated success manager', 'Custom integrations'].map((f, i) => (
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
      <section className="py-24 px-6 bg-ghost-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4">
              Loved by <span className="gradient-text">Business Owners</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "I recovered 3 missed calls on the first day. One of them was a $4,000 job. GhostOps paid for itself in 24 hours.",
                name: "Mike Thompson",
                role: "Thompson Plumbing",
                rating: 5
              },
              {
                quote: "I text a photo of a finished job, and 2 minutes later I'm approving a perfect Instagram post. This is the future.",
                name: "Sarah Chen",
                role: "Chen Renovations",
                rating: 5
              },
              {
                quote: "My ghost employee handles 50+ customer texts a day while I focus on the actual work. Game changer.",
                name: "James Rodriguez",
                role: "Elite HVAC",
                rating: 5
              },
            ].map((t, i) => (
              <div key={i} className="bg-ghost-bg border border-ghost-border rounded-2xl p-6">
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
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-serif text-white mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
          </div>
          
          <div className="space-y-4">
            {[
              {
                q: "Do I need to download an app?",
                a: "No! GhostOps works entirely via SMS. You control everything by texting your GhostOps number. We also offer an optional web dashboard for analytics."
              },
              {
                q: "Will customers know they're talking to AI?",
                a: "Only if they ask directly. Our AI is trained to match your brand voice and responds naturally. Most customers can't tell the difference."
              },
              {
                q: "What if the AI can't handle a question?",
                a: "The AI knows its limits. Complex questions are escalated to you via text with full context. You can jump in at any time."
              },
              {
                q: "How does SMS invoicing work?",
                a: "Text 'invoice John 500 plumbing repair' to your GhostOps number. We create a Stripe invoice and text the payment link to your customer. Auto-reminders at 3 and 7 days."
              },
              {
                q: "Can I pause the AI temporarily?",
                a: "Yes! Just text 'pause' to stop auto-responses and 'resume' to start again. Perfect for vacations or when you want to handle things personally."
              },
            ].map((item, i) => (
              <div key={i} className="bg-ghost-card border border-ghost-border rounded-2xl p-6">
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
            Ready to Hire Your Ghost Employee?
          </h2>
          <p className="text-xl text-ghost-muted mb-8">
            Start your 14-day free trial. No credit card required.
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
              &copy; 2024 GhostOps. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

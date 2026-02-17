'use client'

import Link from 'next/link'
import { Ghost, ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-ghost-bg">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-ghost-bg/80 backdrop-blur-xl border-b border-ghost-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Ghost className="w-6 h-6 text-white" />
              </div>
              <span className="font-serif text-2xl text-white">GhostOps</span>
            </Link>

            <Link
              href="/"
              className="flex items-center gap-2 text-ghost-muted hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-serif text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-ghost-muted mb-12">
            Last updated: February 16, 2026
          </p>

          <div className="prose prose-invert max-w-none space-y-8">
            {/* Introduction */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="text-ghost-muted leading-relaxed">
                Welcome to GhostOps. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the GhostOps platform,
                including our website, SMS services, APIs, and any related services (collectively, the &quot;Service&quot;).
                By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms,
                you may not access or use the Service.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                GhostOps is operated by GhostOps, Inc. (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
                References to &quot;you&quot; or &quot;your&quot; refer to the individual or entity using the Service.
              </p>
            </section>

            {/* Service Description */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">2. Service Description</h2>
              <p className="text-ghost-muted leading-relaxed">
                GhostOps is an AI-powered SMS business assistant platform that provides the following services:
              </p>
              <ul className="list-disc list-inside text-ghost-muted mt-4 space-y-2">
                <li>SMS-based invoicing and payment collection via Stripe</li>
                <li>AI-powered social media management for Instagram and Facebook</li>
                <li>Missed call text-back and lead recovery automation</li>
                <li>Morning business briefings and notifications</li>
                <li>Review management and response automation</li>
                <li>Calendar and appointment management</li>
                <li>Business analytics and reporting via SMS</li>
              </ul>
              <p className="text-ghost-muted leading-relaxed mt-4">
                The Service is designed for small businesses and service professionals to automate routine business
                communications through simple text message commands.
              </p>
            </section>

            {/* Account Registration */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">3. Account Registration and Eligibility</h2>
              <p className="text-ghost-muted leading-relaxed">
                To use the Service, you must:
              </p>
              <ul className="list-disc list-inside text-ghost-muted mt-4 space-y-2">
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into binding contracts</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Promptly notify us of any unauthorized account access</li>
              </ul>
              <p className="text-ghost-muted leading-relaxed mt-4">
                You are responsible for all activities that occur under your account. We reserve the right to refuse
                service, terminate accounts, or remove content at our sole discretion.
              </p>
            </section>

            {/* User Responsibilities */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">4. User Responsibilities</h2>
              <p className="text-ghost-muted leading-relaxed">
                By using the Service, you agree to:
              </p>
              <ul className="list-disc list-inside text-ghost-muted mt-4 space-y-2">
                <li>Use the Service only for lawful purposes and in compliance with all applicable laws</li>
                <li>Not use the Service to send spam, unsolicited messages, or fraudulent communications</li>
                <li>Ensure all customer data you process through the Service is collected with proper consent</li>
                <li>Comply with all applicable SMS marketing laws and regulations (including TCPA, CAN-SPAM)</li>
                <li>Not attempt to reverse engineer, decompile, or disassemble any part of the Service</li>
                <li>Not use the Service to transmit malware, viruses, or other harmful code</li>
                <li>Not impersonate any person or entity or misrepresent your affiliation</li>
                <li>Not interfere with or disrupt the integrity or performance of the Service</li>
              </ul>
            </section>

            {/* Payment Terms */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">5. Payment Terms</h2>
              <p className="text-ghost-muted leading-relaxed">
                <strong className="text-white">Subscription Plans:</strong> The Service is offered on a subscription basis
                with various pricing tiers (Starter, Pro, Agency). Prices are listed on our website and are subject to change
                with 30 days advance notice.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                <strong className="text-white">Billing:</strong> Subscription fees are billed in advance on a monthly basis.
                Your subscription will automatically renew unless you cancel before the renewal date.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                <strong className="text-white">Free Trial:</strong> New users may receive a free trial period. At the end of
                the trial, your subscription will begin unless you cancel. No refunds are provided for partial months of service.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                <strong className="text-white">Payment Processing:</strong> Payments are processed through Stripe. By providing
                payment information, you authorize us to charge your payment method for all fees incurred.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                <strong className="text-white">Usage Limits:</strong> Certain plans include usage limits (e.g., AI message counts).
                Exceeding these limits may result in additional charges or service restrictions.
              </p>
            </section>

            {/* Termination */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">6. Termination</h2>
              <p className="text-ghost-muted leading-relaxed">
                <strong className="text-white">Termination by You:</strong> You may cancel your subscription at any time
                through your account dashboard or by contacting support. Cancellation will take effect at the end of your
                current billing period.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                <strong className="text-white">Termination by Us:</strong> We may suspend or terminate your access to the
                Service immediately, without prior notice, if you breach these Terms, engage in fraudulent activity, or
                fail to pay fees when due.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                <strong className="text-white">Effect of Termination:</strong> Upon termination, your right to use the Service
                will immediately cease. We may retain certain data as required by law or for legitimate business purposes.
                You may request data export prior to account closure.
              </p>
            </section>

            {/* Intellectual Property */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">7. Intellectual Property</h2>
              <p className="text-ghost-muted leading-relaxed">
                The Service and its original content, features, and functionality are owned by GhostOps, Inc. and are
                protected by international copyright, trademark, and other intellectual property laws.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                You retain ownership of all content you submit through the Service. By submitting content, you grant us
                a worldwide, non-exclusive, royalty-free license to use, reproduce, and process that content solely for
                the purpose of providing the Service.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
              <p className="text-ghost-muted leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL GHOSTOPS, ITS DIRECTORS, EMPLOYEES, PARTNERS,
                AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE
                LOSSES, RESULTING FROM:
              </p>
              <ul className="list-disc list-inside text-ghost-muted mt-4 space-y-2">
                <li>Your access to or use of (or inability to access or use) the Service</li>
                <li>Any conduct or content of any third party on the Service</li>
                <li>Any content obtained from the Service</li>
                <li>Unauthorized access, use, or alteration of your transmissions or content</li>
              </ul>
              <p className="text-ghost-muted leading-relaxed mt-4">
                OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING FROM OR RELATING TO THE SERVICE SHALL NOT EXCEED THE AMOUNT
                YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            {/* Disclaimer of Warranties */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-ghost-muted leading-relaxed">
                THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS. GHOSTOPS MAKES NO
                WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                We do not warrant that the Service will be uninterrupted, timely, secure, or error-free. AI-generated
                content and responses may contain inaccuracies. You are responsible for reviewing all content before
                sending to your customers.
              </p>
            </section>

            {/* Indemnification */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">10. Indemnification</h2>
              <p className="text-ghost-muted leading-relaxed">
                You agree to defend, indemnify, and hold harmless GhostOps and its affiliates, officers, directors,
                employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including
                reasonable attorneys&apos; fees, arising out of or in any way connected with your access to or use of the
                Service, your violation of these Terms, or your violation of any rights of a third party.
              </p>
            </section>

            {/* Governing Law */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">11. Governing Law and Dispute Resolution</h2>
              <p className="text-ghost-muted leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware,
                without regard to its conflict of law provisions.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                Any dispute arising from or relating to these Terms or the Service shall first be submitted to mediation.
                If mediation is unsuccessful, the dispute shall be resolved through binding arbitration in accordance with
                the rules of the American Arbitration Association.
              </p>
            </section>

            {/* Changes to Terms */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">12. Changes to Terms</h2>
              <p className="text-ghost-muted leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will
                provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change
                will be determined at our sole discretion.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                By continuing to access or use the Service after any revisions become effective, you agree to be bound
                by the revised terms.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">13. Contact Information</h2>
              <p className="text-ghost-muted leading-relaxed">
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="mt-4 text-ghost-muted">
                <p><strong className="text-white">GhostOps, Inc.</strong></p>
                <p>Email: legal@ghostops.ai</p>
                <p>Support: support@ghostops.ai</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-ghost-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Ghost className="w-6 h-6 text-white" />
              </div>
              <span className="font-serif text-xl text-white">GhostOps</span>
            </Link>

            <div className="flex gap-8 text-ghost-muted">
              <Link href="/privacy" className="hover:text-white transition py-2 min-h-[44px] flex items-center">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition py-2 min-h-[44px] flex items-center">Terms</Link>
              <a href="mailto:support@ghostops.ai" className="hover:text-white transition py-2 min-h-[44px] flex items-center">Contact</a>
            </div>

            <div className="text-ghost-muted text-sm">
              &copy; 2026 GhostOps. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

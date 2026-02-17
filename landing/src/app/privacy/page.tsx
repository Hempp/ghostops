'use client'

import Link from 'next/link'
import { Ghost, ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-ghost-muted mb-12">
            Last updated: February 16, 2026
          </p>

          <div className="prose prose-invert max-w-none space-y-8">
            {/* Introduction */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="text-ghost-muted leading-relaxed">
                GhostOps, Inc. (&quot;GhostOps,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting
                your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when
                you use our SMS business assistant platform and related services (the &quot;Service&quot;).
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                Please read this Privacy Policy carefully. By using the Service, you consent to the data practices described
                in this policy. If you do not agree with the terms of this Privacy Policy, please do not access or use the Service.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-medium text-white mt-6 mb-3">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside text-ghost-muted space-y-2">
                <li><strong className="text-white">Account Information:</strong> Name, email address, phone number, business name, and industry</li>
                <li><strong className="text-white">Payment Information:</strong> Credit card details and billing address (processed by Stripe)</li>
                <li><strong className="text-white">Customer Data:</strong> Contact information for your customers that you input into the Service</li>
                <li><strong className="text-white">Communication Content:</strong> SMS messages, images, and files you send through the Service</li>
                <li><strong className="text-white">Social Media Credentials:</strong> Access tokens for connected Instagram and Facebook accounts</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-6 mb-3">2.2 Information Collected Automatically</h3>
              <ul className="list-disc list-inside text-ghost-muted space-y-2">
                <li><strong className="text-white">Usage Data:</strong> Features used, commands sent, response times, and interaction patterns</li>
                <li><strong className="text-white">Device Information:</strong> Phone number, carrier information, and device type (for SMS delivery)</li>
                <li><strong className="text-white">Log Data:</strong> IP address, browser type, access times, and referring URLs (for web dashboard)</li>
                <li><strong className="text-white">Analytics Data:</strong> Aggregated usage statistics and performance metrics</li>
              </ul>

              <h3 className="text-xl font-medium text-white mt-6 mb-3">2.3 Information from Third Parties</h3>
              <ul className="list-disc list-inside text-ghost-muted space-y-2">
                <li><strong className="text-white">Twilio:</strong> SMS delivery status, phone number validation, and call metadata</li>
                <li><strong className="text-white">Stripe:</strong> Payment confirmation, subscription status, and fraud detection signals</li>
                <li><strong className="text-white">Meta (Facebook/Instagram):</strong> Social media account information and posting metrics</li>
                <li><strong className="text-white">Google:</strong> Review data and calendar information (when connected)</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p className="text-ghost-muted leading-relaxed">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc list-inside text-ghost-muted mt-4 space-y-2">
                <li><strong className="text-white">Provide the Service:</strong> Process your commands, send SMS messages, manage invoices, and post to social media</li>
                <li><strong className="text-white">Process Payments:</strong> Charge subscription fees and process customer payments through your account</li>
                <li><strong className="text-white">AI Processing:</strong> Analyze your messages to generate appropriate responses and content</li>
                <li><strong className="text-white">Improve the Service:</strong> Analyze usage patterns, fix bugs, and develop new features</li>
                <li><strong className="text-white">Customer Support:</strong> Respond to your questions and resolve issues</li>
                <li><strong className="text-white">Communications:</strong> Send service updates, security alerts, and administrative messages</li>
                <li><strong className="text-white">Legal Compliance:</strong> Comply with applicable laws, regulations, and legal processes</li>
              </ul>
            </section>

            {/* Data Storage and Security */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">4. Data Storage and Security</h2>
              <p className="text-ghost-muted leading-relaxed">
                <strong className="text-white">Database:</strong> Your data is stored on Supabase, which uses PostgreSQL databases
                with row-level security policies. Data is encrypted at rest and in transit.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                <strong className="text-white">Security Measures:</strong> We implement industry-standard security measures including:
              </p>
              <ul className="list-disc list-inside text-ghost-muted mt-2 space-y-2">
                <li>TLS/SSL encryption for all data in transit</li>
                <li>AES-256 encryption for data at rest</li>
                <li>Row-level security (RLS) policies for data isolation</li>
                <li>Regular security audits and penetration testing</li>
                <li>Access logging and monitoring</li>
                <li>Multi-factor authentication for administrative access</li>
              </ul>
              <p className="text-ghost-muted leading-relaxed mt-4">
                <strong className="text-white">Data Retention:</strong> We retain your data for as long as your account is active
                or as needed to provide the Service. Upon account termination, we will delete your data within 90 days, except
                where retention is required by law.
              </p>
            </section>

            {/* Third-Party Services */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">5. Third-Party Services</h2>
              <p className="text-ghost-muted leading-relaxed">
                We use the following third-party services to operate the Service. Each has its own privacy policy governing
                their use of your data:
              </p>

              <div className="mt-6 space-y-4">
                <div className="border-l-2 border-emerald-600 pl-4">
                  <h3 className="text-lg font-medium text-white">Twilio</h3>
                  <p className="text-ghost-muted text-sm mt-1">
                    SMS and voice services. Processes phone numbers, message content, and delivery status.
                  </p>
                  <a href="https://www.twilio.com/legal/privacy" target="_blank" rel="noopener noreferrer"
                     className="text-emerald-400 text-sm hover:underline">View Twilio Privacy Policy</a>
                </div>

                <div className="border-l-2 border-emerald-600 pl-4">
                  <h3 className="text-lg font-medium text-white">Stripe</h3>
                  <p className="text-ghost-muted text-sm mt-1">
                    Payment processing. Handles credit card information, billing addresses, and transaction data.
                  </p>
                  <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer"
                     className="text-emerald-400 text-sm hover:underline">View Stripe Privacy Policy</a>
                </div>

                <div className="border-l-2 border-emerald-600 pl-4">
                  <h3 className="text-lg font-medium text-white">Supabase</h3>
                  <p className="text-ghost-muted text-sm mt-1">
                    Database hosting and authentication. Stores all application data securely.
                  </p>
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer"
                     className="text-emerald-400 text-sm hover:underline">View Supabase Privacy Policy</a>
                </div>

                <div className="border-l-2 border-emerald-600 pl-4">
                  <h3 className="text-lg font-medium text-white">Anthropic (Claude AI)</h3>
                  <p className="text-ghost-muted text-sm mt-1">
                    AI processing. Analyzes message content to generate responses and content.
                  </p>
                  <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer"
                     className="text-emerald-400 text-sm hover:underline">View Anthropic Privacy Policy</a>
                </div>

                <div className="border-l-2 border-emerald-600 pl-4">
                  <h3 className="text-lg font-medium text-white">Meta (Facebook/Instagram)</h3>
                  <p className="text-ghost-muted text-sm mt-1">
                    Social media integration. Publishes content and retrieves account analytics.
                  </p>
                  <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer"
                     className="text-emerald-400 text-sm hover:underline">View Meta Privacy Policy</a>
                </div>

                <div className="border-l-2 border-emerald-600 pl-4">
                  <h3 className="text-lg font-medium text-white">Vercel</h3>
                  <p className="text-ghost-muted text-sm mt-1">
                    Web hosting. Serves the landing page and dashboard application.
                  </p>
                  <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer"
                     className="text-emerald-400 text-sm hover:underline">View Vercel Privacy Policy</a>
                </div>
              </div>
            </section>

            {/* Cookies and Tracking */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">6. Cookies and Tracking Technologies</h2>
              <p className="text-ghost-muted leading-relaxed">
                Our web dashboard uses cookies and similar tracking technologies to enhance your experience:
              </p>
              <ul className="list-disc list-inside text-ghost-muted mt-4 space-y-2">
                <li><strong className="text-white">Essential Cookies:</strong> Required for authentication and security</li>
                <li><strong className="text-white">Functional Cookies:</strong> Remember your preferences and settings</li>
                <li><strong className="text-white">Analytics Cookies:</strong> Help us understand how you use the Service</li>
              </ul>
              <p className="text-ghost-muted leading-relaxed mt-4">
                You can control cookie preferences through your browser settings. Note that disabling certain cookies may
                limit functionality of the web dashboard.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                <strong className="text-white">SMS-Based Usage:</strong> The core SMS functionality does not use cookies as
                it operates entirely through text messages.
              </p>
            </section>

            {/* Your Rights (GDPR) */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">7. Your Privacy Rights</h2>
              <p className="text-ghost-muted leading-relaxed">
                Depending on your location, you may have the following rights regarding your personal data:
              </p>
              <ul className="list-disc list-inside text-ghost-muted mt-4 space-y-2">
                <li><strong className="text-white">Right to Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong className="text-white">Right to Rectification:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong className="text-white">Right to Erasure:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
                <li><strong className="text-white">Right to Restrict Processing:</strong> Request limitation of how we use your data</li>
                <li><strong className="text-white">Right to Data Portability:</strong> Request a machine-readable copy of your data</li>
                <li><strong className="text-white">Right to Object:</strong> Object to processing of your data for certain purposes</li>
                <li><strong className="text-white">Right to Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="text-ghost-muted leading-relaxed mt-4">
                To exercise any of these rights, please contact us at privacy@ghostops.ai. We will respond to your request
                within 30 days. We may need to verify your identity before processing your request.
              </p>
            </section>

            {/* International Data Transfers */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">8. International Data Transfers</h2>
              <p className="text-ghost-muted leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence.
                These countries may have data protection laws that are different from the laws of your country.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                We take appropriate safeguards to ensure that your personal data remains protected in accordance with this
                Privacy Policy, including the use of Standard Contractual Clauses approved by the European Commission for
                transfers of personal data from the EEA to third countries.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">9. Children&apos;s Privacy</h2>
              <p className="text-ghost-muted leading-relaxed">
                The Service is not intended for individuals under the age of 18. We do not knowingly collect personal
                information from children under 18. If you are a parent or guardian and believe your child has provided
                us with personal information, please contact us at privacy@ghostops.ai, and we will take steps to delete
                such information.
              </p>
            </section>

            {/* California Privacy Rights */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">10. California Privacy Rights (CCPA)</h2>
              <p className="text-ghost-muted leading-relaxed">
                If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="list-disc list-inside text-ghost-muted mt-4 space-y-2">
                <li><strong className="text-white">Right to Know:</strong> Request disclosure of personal information collected, used, and shared</li>
                <li><strong className="text-white">Right to Delete:</strong> Request deletion of your personal information</li>
                <li><strong className="text-white">Right to Opt-Out:</strong> Opt out of the sale of your personal information (note: we do not sell personal information)</li>
                <li><strong className="text-white">Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
              </ul>
              <p className="text-ghost-muted leading-relaxed mt-4">
                To exercise these rights, contact us at privacy@ghostops.ai or call us at the number provided below.
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-ghost-muted leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
                Privacy Policy on this page and updating the &quot;Last updated&quot; date. For material changes, we will
                provide additional notice via email or through the Service.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                We encourage you to review this Privacy Policy periodically for any changes. Your continued use of the
                Service after any modifications indicates your acceptance of the updated Privacy Policy.
              </p>
            </section>

            {/* Contact Information */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Us</h2>
              <p className="text-ghost-muted leading-relaxed">
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="mt-4 text-ghost-muted">
                <p><strong className="text-white">GhostOps, Inc.</strong></p>
                <p>Email: privacy@ghostops.ai</p>
                <p>Support: support@ghostops.ai</p>
                <p className="mt-4">
                  For GDPR-related inquiries, you may also contact our Data Protection Officer at dpo@ghostops.ai
                </p>
              </div>
            </section>

            {/* Data Processing Agreement */}
            <section className="bg-ghost-card border border-ghost-border rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">13. Data Processing Agreement</h2>
              <p className="text-ghost-muted leading-relaxed">
                When you use GhostOps to process customer data, you act as the Data Controller and GhostOps acts as the
                Data Processor. We process personal data only according to your instructions and in compliance with
                applicable data protection laws.
              </p>
              <p className="text-ghost-muted leading-relaxed mt-4">
                Enterprise and Agency plan customers may request a formal Data Processing Agreement (DPA) by contacting
                legal@ghostops.ai.
              </p>
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

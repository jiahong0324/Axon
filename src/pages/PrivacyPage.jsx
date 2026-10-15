import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import { Shield, Lock, Eye, Database, Sparkles, CheckCircle2, AlertTriangle, FileText, Ban } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <>
      <SEO
        title="Privacy Policy | Axon"
        description="Learn how Axon protects your academic records, encrypts your data, and safeguards student privacy."
        keywords="Axon privacy policy, student data security, FERPA compliance, education privacy, encrypted student dashboard"
      />
      <main
        className="h-screen h-[100dvh] overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,#E0E7FF,#EEF4FB_55%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] dark:text-white px-4 py-10 transition-colors duration-300"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mx-auto max-w-4xl glass rounded-3xl p-6 sm:p-10 shadow-2xl mb-12">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                <Shield className="h-3.5 w-3.5" /> Student Privacy &amp; Data Security
              </div>
              <h1 className="text-3xl font-extrabold font-heading text-slate-950 dark:text-white">Privacy Policy</h1>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Last modified: October 2026 &bull; Effective upon access or registration
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/terms" className="btn-ghost text-sm">Terms of Service</Link>
              <Link to="/" className="btn-secondary text-sm">Home</Link>
            </div>
          </div>

          {/* Core Guarantees Banner */}
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Lock className="h-5 w-5 text-theme-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero Data Selling</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">We never sell, rent, license, or monetize your study records or personal data to advertisers or third parties.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Sparkles className="h-5 w-5 text-amber-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Private AI Assistance</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Your notes and study prompts are never used to train public generative AI foundation models.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Database className="h-5 w-5 text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Encrypted &amp; Isolated</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Row-Level Security (RLS) ensures only your authenticated account can access your timetable and records.</p>
            </div>
          </div>

          {/* Policy Sections */}
          <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">1.</span> Introduction &amp; Scope
              </h2>
              <p className="mb-2">
                This Privacy Policy explains how Axon (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, or the &ldquo;Operator&rdquo;) collects, processes, stores, and protects personal and academic information when you access or use our web application, progressive web app, AI Study Helper, and related services (collectively, the &ldquo;Service&rdquo;).
              </p>
              <p>
                By using Axon, you consent to the data collection, transfer, storage, and processing practices detailed in this Policy. If you do not agree with any practice described herein, your sole and exclusive remedy is to immediately discontinue using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">2.</span> Information We Collect
              </h2>
              <p className="mb-2">We collect only information necessary to deliver and maintain your digital academic workspace:</p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
                <li><strong className="text-slate-800 dark:text-slate-200">Account Credentials:</strong> Full name, email address, encrypted and salted password hashes, and user metadata provided during registration or OAuth sign-in (e.g., Google authentication).</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Academic &amp; Coursework Data:</strong> University course codes, class titles, lecture locations, professor names, assignment descriptions, due dates, exam dates, syllabus notes, and grade simulation inputs.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">AI Helper Prompts &amp; Uploads:</strong> Text prompts, questions, mathematical formulas, and course slip screenshots you elect to upload to the AI Study Helper or OCR parser for real-time analysis.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Device, Usage &amp; Preference Telemetry:</strong> Selected theme (dark/light), accent color, language choice, browser type, operating system version, and anonymous crash telemetry used strictly for operational stability.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">3.</span> Prohibited Sensitive Data
              </h2>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> USER RESTRICTION: PROHIBITION ON SENSITIVE PERSONAL DATA
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You are <strong>STRICTLY FORBIDDEN</strong> from uploading, storing, or transmitting through Axon (including in notes, assignment titles, or AI prompts) any:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <li>Government identification numbers (Social Security numbers, national identity cards, passport numbers).</li>
                  <li>Payment card numbers, banking credentials, or financial account details.</li>
                  <li>Medical records, health diagnosis data, or biometric data.</li>
                  <li>Confidential, classified, or leaked examination papers and grading keys.</li>
                </ul>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  Axon disclaims all liability, legal duty, and responsibility in the event you upload or disclose any prohibited sensitive information.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">4.</span> How We Use Your Data
              </h2>
              <p className="mb-2">Your information is utilized solely to provide, operate, and maintain the Service:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>To render your interactive timetable, assignment lists, exam countdowns, and GPA simulations.</li>
                <li>To dispatch scheduled push notifications and deadline reminders to your device.</li>
                <li>To generate on-demand study flashcards, summary breakdowns, and concept explanations via the AI Study Helper.</li>
                <li>To synchronize state seamlessly between your desktop, tablet, and mobile devices.</li>
                <li>To detect, prevent, and remediate technical bugs, unauthorized intrusion attempts, or security anomalies.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">5.</span> Security Measures &amp; INHERENT INTERNET RISK DISCLAIMER
              </h2>
              <p className="mb-2">
                We implement defense-in-depth, industry-standard technical safeguards to protect your personal information:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-3">
                <li><strong>Encryption in Transit:</strong> All HTTP traffic is protected by Transport Layer Security (TLS 1.3/HTTPS).</li>
                <li><strong>Encryption at Rest:</strong> Database volumes are encrypted using AES-256 standard encryption.</li>
                <li><strong>Row-Level Security (RLS):</strong> PostgreSQL database policies enforce strict multi-tenant isolation, ensuring User A cannot read or modify data belonging to User B.</li>
                <li><strong>Stateless Authentication:</strong> User sessions rely on cryptographically signed JWT tokens.</li>
              </ul>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong className="text-red-700 dark:text-red-300 uppercase block mb-1">
                  NO GUARANTEE OF INVULNERABILITY:
                </strong>
                WHILE WE EMPLOY COMMERCIAL-GRADE SECURITY PRACTICES, NO METHOD OF TRANSMISSION OVER THE INTERNET OR CLOUD STORAGE CAN BE GUARANTEED AS 100% SECURE. WE CANNOT AND DO NOT WARRANT, PROMISE, OR GUARANTEE ABSOLUTE IMMUNITY FROM UNFORESEEN CYBERATTACKS, ZERO-DAY EXPLOITS, THIRD-PARTY DATA INTERCEPTION, HARDWARE FAILURES, OR UNAUTHORIZED INTRUSIONS. YOU TRANSMIT AND STORE INFORMATION IN AXON AT YOUR OWN RISK.
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">6.</span> Third-Party Sub-processors &amp; Cloud Infrastructure
              </h2>
              <p className="mb-2">
                To provide the Service, we partner with specialized, enterprise-grade third-party cloud infrastructure providers (&ldquo;Sub-processors&rdquo;):
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-2">
                <li><strong>Supabase Inc.:</strong> Cloud database hosting, database backup infrastructure, and authentication management.</li>
                <li><strong>Vercel Inc.:</strong> Static front-end web application hosting and edge content delivery network (CDN).</li>
                <li><strong>Foundation AI Providers:</strong> Enterprise API endpoints providing natural language processing for the AI Study Helper. We contractually partner exclusively with providers maintaining strict zero-data-retention training policies.</li>
              </ul>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                While we vet sub-processors for compliance with global standards, Axon disclaims any liability for outages, security incidents, or technical failures occurring within third-party external networks outside our direct control.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">7.</span> Guest Mode &amp; Local Storage Disclaimer
              </h2>
              <p className="mb-2">
                When you access the Service using &ldquo;Try as guest&rdquo;, an isolated guest session is initialized. Guest data is stored primarily in your browser&apos;s local storage (<code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-xs">localStorage</code> / IndexedDB).
              </p>
              <p>
                <strong>GUEST DATA LOSS WARNING:</strong> Because guest sessions are ephemeral, clearing your browser cache, utilizing Incognito/Private Browsing modes, or switching devices will cause immediate and irreversible loss of guest data. <strong>Axon accepts no responsibility for lost guest records, unexported timetables, or study logs resulting from local cache clearing or trial expiration.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">8.</span> Cookies, Tracking &amp; Local Preferences
              </h2>
              <p>
                Axon does not use invasive third-party cross-site advertising trackers, marketing pixels, or ad networks. We utilize standard browser local storage solely to store functional state: your active authentication session token, chosen theme (dark/light), selected accent color, and language preferences.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">9.</span> International Data Storage &amp; Cross-Border Transfers
              </h2>
              <p>
                By using Axon, you acknowledge that our third-party servers and cloud providers are located in various jurisdictions around the world. Your personal data may be transferred to, stored, and processed in a country other than your country of residence, where data protection laws may differ from those in your home jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">10.</span> Your Rights &amp; Permanent Data Erasure
              </h2>
              <p className="mb-2">
                Under applicable privacy laws (such as GDPR, PDPA, and student privacy principles), you possess the right to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-2">
                <li><strong className="text-slate-800 dark:text-slate-200">Access &amp; Export:</strong> Request a digital copy of the academic and profile data you have provided.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Correction:</strong> Update, revise, or edit incomplete or inaccurate entries in your profile settings.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Permanent Erasure:</strong> Delete your account and purge all associated timetable, assignment, and exam database entries.</li>
              </ul>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Account deletion requests can be initiated from the student Settings screen or submitted to us via the contact form. Once processed, your account data is permanently expunged.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">11.</span> Children&apos;s Privacy (COPPA / Age Limits)
              </h2>
              <p>
                Axon is designed for higher education, high school, and secondary students. The Service is not intended for children under 13 years of age (or the minimum legal age of digital consent in your jurisdiction). We do not knowingly collect personal data from children under 13. If you become aware that a child under 13 has created an account without parental consent, please contact us immediately so we can promptly terminate the account and purge their data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">12.</span> Changes to this Privacy Policy
              </h2>
              <p>
                We reserve the right to revise, update, or modify this Privacy Policy at our sole discretion at any time. Any changes will become effective immediately upon posting the updated Policy to the Service. The &ldquo;Last modified&rdquo; date at the top of this page indicates the date of latest revision. Your continued use of the Service following the posting of any amendments signifies your full acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">13.</span> Contact &amp; Data Requests
              </h2>
              <p>
                If you have questions or concerns regarding this Privacy Policy or wish to exercise any of your data rights, please contact us via our{' '}
                <Link to="/contact" className="text-theme-600 dark:text-theme-400 font-semibold hover:underline">
                  Contact Form
                </Link>.
              </p>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
            <Link to="/terms" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-theme-600 dark:hover:text-white">
              &larr; View Terms and Conditions of Use
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-ghost text-sm">
                Back to Sign In
              </Link>
              <Link to="/register" className="btn-primary text-sm">
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

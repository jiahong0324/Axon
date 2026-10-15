import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import { Shield, Lock, Eye, Database, Sparkles, CheckCircle2, AlertTriangle, FileText } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <>
      <SEO
        title="Privacy Policy | Axon"
        description="Learn how Axon protects your academic records, encrypts your data, and safeguards student privacy."
        keywords="Axon privacy policy, student data security, education privacy, encrypted student dashboard"
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
                <Shield className="h-3.5 w-3.5" /> Student Privacy Commitment
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
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">We never sell, rent, license, or monetize student records to advertisers or third parties.</p>
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
                At Axon, we believe educational productivity tools should protect students rather than exploit them. This Privacy Policy details how Axon (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, handles, stores, and protects personal and academic information when you use our web application, progressive web app, AI Study Helper, and related services (collectively, the &ldquo;Service&rdquo;).
              </p>
              <p>
                By using Axon, you agree to the practices described in this Privacy Policy. If you do not agree with any part of this Policy, you should discontinue using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">2.</span> Information We Collect
              </h2>
              <p className="mb-2">We collect only information necessary to deliver and maintain your digital academic workspace:</p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
                <li><strong className="text-slate-800 dark:text-slate-200">Account Credentials:</strong> Full name, email address, cryptographically hashed passwords, and profile preferences provided during registration or OAuth sign-in.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Academic &amp; Coursework Data:</strong> Course codes, class schedules, lecture locations, professor names, assignment descriptions, due dates, exam dates, syllabus notes, and grade simulation inputs.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">AI Helper Prompts &amp; Uploads:</strong> Text prompts, study questions, equations, and timetable screenshot images you elect to upload to the AI Study Helper or OCR parser for real-time analysis.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Device &amp; Preference Telemetry:</strong> Selected theme (dark/light), accent color, language choice, browser type, and operating system used strictly for operational stability.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">3.</span> Prohibition on Sensitive Personal Data
              </h2>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> USER RESTRICTION: PROHIBITION ON SENSITIVE PERSONAL DATA
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You are <strong>STRICTLY FORBIDDEN</strong> from uploading, storing, or transmitting through Axon (including in notes, assignment titles, or AI prompts) any:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <li>Government identification numbers, national ID numbers, or passport numbers.</li>
                  <li>Payment card numbers, banking credentials, or financial account details.</li>
                  <li>Medical records, health diagnosis data, or biometric data.</li>
                  <li>Confidential, classified, or leaked examination papers and grading keys.</li>
                </ul>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  Axon disclaims all liability and legal responsibility if a user elects to upload prohibited sensitive information.
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
                <li>To deliver scheduled deadline reminders and class alerts to your device.</li>
                <li>To generate on-demand study flashcards, summary breakdowns, and concept explanations via the AI Study Helper.</li>
                <li>To synchronize data across your smartphone, tablet, and computer.</li>
                <li>To detect, prevent, and remediate technical bugs or security anomalies.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">5.</span> Security Safeguards &amp; Inherent Risk Disclaimer
              </h2>
              <p className="mb-2">
                We implement defense-in-depth, industry-standard technical safeguards to protect your personal information:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-3">
                <li><strong>Encryption in Transit:</strong> All web traffic is encrypted with Transport Layer Security (TLS 1.3 / HTTPS).</li>
                <li><strong>Encryption at Rest:</strong> Database volumes are protected with AES-256 standard encryption.</li>
                <li><strong>Row-Level Security (RLS):</strong> Multi-tenant database policies ensure students cannot access records belonging to other users.</li>
              </ul>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong className="text-red-700 dark:text-red-300 uppercase block mb-1">
                  NO WARRANTY OF ABSOLUTE IMMUNITY:
                </strong>
                WHILE WE EMPLOY COMMERCIAL-GRADE SECURITY PRACTICES, NO METHOD OF TRANSMISSION OVER THE INTERNET OR CLOUD STORAGE CAN BE GUARANTEED AS 100% SECURE. WE CANNOT AND DO NOT WARRANT IMMUNITY FROM UNFORESEEN CYBERATTACKS, ZERO-DAY EXPLOITS, THIRD-PARTY INTERCEPTIONS, OR COMPROMISED USER PASSWORDS. YOU STORE INFORMATION IN AXON AT YOUR OWN RISK.
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">6.</span> Third-Party Sub-processors &amp; Cloud Infrastructure
              </h2>
              <p className="mb-2">
                To provide the Service, we partner with enterprise-grade cloud infrastructure providers:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-2">
                <li><strong>Supabase:</strong> Cloud database hosting, authentication management, and database backups.</li>
                <li><strong>Vercel:</strong> Front-end web application hosting and edge content delivery network (CDN).</li>
                <li><strong>Enterprise AI Providers:</strong> API endpoints providing natural language processing for the AI Study Helper. Our partners operate under strict zero-data-retention training policies.</li>
              </ul>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Axon disclaims liability for external outages, security incidents, or technical failures occurring on third-party cloud infrastructure outside our direct control.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">7.</span> Data Retention &amp; Guest Mode Ephemeral Storage
              </h2>
              <p className="mb-2">
                Personal data is retained only for as long as your account remains active or until you request account deletion.
              </p>
              <p>
                <strong>Guest Mode Warning:</strong> Guest mode data is stored solely in your local browser cache (<code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-xs">localStorage</code>). Clearing browser history, using incognito windows, or switching devices will permanently destroy unexported data. Axon accepts no responsibility for lost guest records.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">8.</span> Cookies &amp; Local Preferences
              </h2>
              <p>
                Axon does not use invasive third-party cross-site advertising trackers or advertising pixels. We use standard browser local storage solely to store functional state: active session tokens, dark/light theme, accent color, and language preferences.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">9.</span> Your Rights &amp; Permanent Data Erasure
              </h2>
              <p className="mb-2">
                You maintain ownership of your personal and academic data. You have the right to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-2">
                <li><strong className="text-slate-800 dark:text-slate-200">Access:</strong> View all coursework and profile information in your student dashboard.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Correction:</strong> Edit, update, or revise any schedule or personal entry.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Erasure:</strong> Delete your account and purge all associated database records.</li>
              </ul>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                You can manage your data directly from the student Settings screen or request permanent account deletion via our contact channels.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">10.</span> Age Eligibility &amp; Minor Protection
              </h2>
              <p>
                Axon is designed for university, college, and secondary students. The Service is not directed to individuals under 13 years of age. Users under the age of majority should obtain consent from a parent or legal guardian prior to registering an account or uploading study data. If we discover that a child under 13 has provided personal data without parental authorization, we will promptly terminate the account and purge their data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">11.</span> Changes to this Policy
              </h2>
              <p>
                We reserve the right to revise or update this Privacy Policy at our discretion at any time. Any changes will become effective immediately upon posting to the Service. Your continued use of the Service following any revisions signifies your acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">12.</span> Contact Us
              </h2>
              <p>
                If you have questions or concerns regarding this Privacy Policy or your personal data, please contact us via our{' '}
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

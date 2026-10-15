import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import { Shield, Lock, Eye, Database, Sparkles, CheckCircle2 } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <>
      <SEO
        title="Privacy Policy | Axon"
        description="Learn how Axon protects your academic records, encrypts your data, and safeguards student privacy."
        keywords="Axon privacy policy, student data security, FERPA compliance, education privacy, encrypted student dashboard"
      />
      <main className="h-screen h-[100dvh] overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,#E0E7FF,#EEF4FB_55%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] dark:text-white px-4 py-10 transition-colors duration-300" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="mx-auto max-w-4xl glass rounded-3xl p-6 sm:p-10 shadow-2xl mb-12">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                <Shield className="h-3.5 w-3.5" /> Student Privacy Commitment
              </div>
              <h1 className="text-3xl font-extrabold font-heading text-slate-950 dark:text-white">Privacy Policy</h1>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Last updated: October 2026 &bull; Effective immediately
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/" className="btn-ghost text-sm">Home</Link>
              <Link to="/login" className="btn-secondary text-sm">Sign In</Link>
            </div>
          </div>

          {/* Core Guarantees Banner */}
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Lock className="h-5 w-5 text-theme-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero Data Selling</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">We never sell, rent, or monetize your study records or personal data to advertisers.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Sparkles className="h-5 w-5 text-amber-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Private AI Assistance</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Your notes and study prompts are never used to train public generative AI models.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Database className="h-5 w-5 text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Encrypted &amp; Isolated</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Row-Level Security (RLS) ensures only you can view your timetable and assignments.</p>
            </div>
          </div>

          {/* Policy Sections */}
          <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">1.</span> Introduction
              </h2>
              <p>
                At Axon, we believe that academic productivity tools should protect students rather than exploit them. This Privacy Policy details how Axon (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, encrypts, and handles your data when you use the Axon web application, mobile PWA, and related services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">2.</span> Information We Collect
              </h2>
              <p className="mb-3">We collect only information necessary to deliver a seamless academic management experience:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li><strong className="text-slate-800 dark:text-slate-200">Account Credentials:</strong> Full name, email address, password hash (salted and encrypted), and university/course profile details.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Academic Records:</strong> Course schedules, lecture times, venues, assignment deadlines, exam dates, syllabus notes, and progress status tags.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">AI Helper Interactions:</strong> Questions, study prompts, text excerpts, or document images you submit to the AI Study Helper solely for real-time analysis.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Application Preferences:</strong> Color theme (light/dark mode), accent color, notification lead times, and language preferences.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">3.</span> How We Use Your Information
              </h2>
              <p className="mb-2">Your information is used strictly to power your academic workspace:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>To render your interactive timetable, assignment lists, exam countdowns, and revision plans.</li>
                <li>To deliver automated deadline alerts, class reminders, and weekly study summaries via push notifications or email.</li>
                <li>To provide contextual AI-powered study assistance, flashcard generation, and concept clarification.</li>
                <li>To synchronize your data seamlessly across your laptop, tablet, and smartphone.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">4.</span> Data Security &amp; Infrastructure
              </h2>
              <p className="mb-3">
                Security is foundational to our architecture. We implement modern, defense-in-depth safeguards:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li><strong className="text-slate-800 dark:text-slate-200">Transport Layer Security (TLS 1.3):</strong> All network communications between your browser and our servers are encrypted in transit.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">AES-256 Storage Encryption:</strong> Data stored in our database is encrypted at rest using industry standards.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Row-Level Security (RLS):</strong> Our database enforces strict row-level policies. User A cannot query, view, or modify the classes or coursework belonging to User B.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Authentication Safeguards:</strong> Cryptographic token verification and secure rate limiting prevent unauthorized access.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">5.</span> AI Privacy &amp; Third-Party Processing
              </h2>
              <p>
                When you use the AI Study Helper, your prompts are transmitted over secure APIs to process your study request. <strong>We strictly prohibit our AI partners from using your prompts or academic content to train public AI foundation models.</strong> We partner only with enterprise AI infrastructure providers offering explicit zero-data-retention training policies.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">6.</span> Guest Mode Privacy
              </h2>
              <p>
                When you select &ldquo;Try as guest - no signup&rdquo;, we provision an isolated guest session. Guest data is kept strictly private and can be upgraded to a permanent account at any time. If you do not upgrade, guest data is purged automatically after the trial window expires.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">7.</span> Cookies &amp; Local Storage
              </h2>
              <p>
                Axon does not use invasive third-party tracking cookies or advertising pixels. We utilize standard browser <code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-xs">localStorage</code> to remember your theme choice (dark/light), selected accent color, language preference, and active session tokens so you don&apos;t have to re-login every time you open the app.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">8.</span> Your Rights &amp; Data Deletion
              </h2>
              <p className="mb-2">
                You maintain complete ownership of your academic data. Under global privacy standards (including GDPR, PDPA, and FERPA-aligned educational privacy principles), you have the right to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li><strong className="text-slate-800 dark:text-slate-200">Export:</strong> Download your timetable, exam schedule, and assignment data anytime.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Rectification:</strong> Edit or correct any academic or personal information in your settings.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Erasure:</strong> Request immediate, permanent deletion of your account and all associated database records.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">9.</span> Contact Us
              </h2>
              <p>
                If you have any questions or feedback regarding this Privacy Policy or wish to exercise your data rights, please contact us via our{' '}
                <Link to="/contact" className="text-theme-600 dark:text-theme-400 font-semibold hover:underline">
                  Contact Form
                </Link>{' '}
                or reach out directly through the student dashboard feedback tool.
              </p>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <Link to="/terms" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-theme-600 dark:hover:text-white">
              &larr; View Terms and Conditions
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Create Free Account
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

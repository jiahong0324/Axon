import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import { Scale, AlertTriangle, ShieldCheck, Ban } from 'lucide-react'

export default function TermsPage() {
  return (
    <>
      <SEO
        title="Terms and Conditions | Axon"
        description="Terms and Conditions of Use for the Axon academic productivity and student dashboard platform."
        keywords="Axon terms of service, student planner terms, liability disclaimer, academic honesty policy"
      />
      <main
        className="h-screen h-[100dvh] overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,#E0E7FF,#EEF4FB_55%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] dark:text-white px-4 py-10 transition-colors duration-300"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mx-auto max-w-4xl glass rounded-3xl p-6 sm:p-10 shadow-2xl mb-12">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 dark:bg-blue-500/20 px-3.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 mb-2">
                <Scale className="h-3.5 w-3.5" /> Legal Agreement
              </div>
              <h1 className="text-3xl font-extrabold font-heading text-slate-950 dark:text-white">Terms and Conditions of Use</h1>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Last modified: October 2026 &bull; Effective upon access, registration, or guest usage
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/privacy" className="btn-ghost text-sm">Privacy Policy</Link>
              <Link to="/login" className="btn-secondary text-sm">Sign In</Link>
            </div>
          </div>

          {/* Highlights Banner */}
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">As-Is Service</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Provided strictly &ldquo;as is&rdquo; without warranties of any kind, uptime guarantees, or error-free representations.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Ban className="h-5 w-5 text-red-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Academic Liability</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">We accept zero liability for missed class timetables, exam deadlines, GPA changes, or academic infractions.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <ShieldCheck className="h-5 w-5 text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero Monetary Liability</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">To the maximum extent allowed by law, operator financial liability for free or guest use is strictly zero.</p>
            </div>
          </div>

          {/* Full Terms Content */}
          <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">1.</span> Agreement to Terms &amp; Eligibility
              </h2>
              <p className="mb-2">
                These Terms and Conditions (&ldquo;Terms&rdquo;) constitute a binding legal agreement between you (&ldquo;User&rdquo;, &ldquo;Student&rdquo;, or &ldquo;You&rdquo;) and Axon (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, or the &ldquo;Operator&rdquo;), governing your access to and use of the Axon web application, progressive web app, AI Study Helper, and associated digital services (the &ldquo;Service&rdquo;).
              </p>
              <p className="mb-2">
                By creating an account, selecting &ldquo;Try as guest&rdquo;, or otherwise accessing the Service, you confirm that you have read, understood, and agreed to be bound by these Terms in their entirety.
              </p>
              <p>
                <strong>Minors:</strong> If you are under the legal age of majority in your jurisdiction, you represent and warrant that you have obtained the consent and supervision of a parent or legal guardian who agrees to these Terms on your behalf. If you do not agree to these Terms, you must immediately discontinue using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">2.</span> Scope as a Personal Organizational Tool
              </h2>
              <p className="mb-2">
                Axon is an auxiliary, self-managed personal productivity application created to assist students with schedule organization, assignment tracking, exam countdowns, study consistency, and note consolidation.
              </p>
              <p>
                <strong>Independence from Institutions:</strong> Axon is an independent software tool and is <strong>NOT</strong> an official representative, partner, affiliate, or agent of your university, college, school, examination board, or educational authority. Information presented in Axon is user-entered or machine-processed and does not replace official institutional notices, course syllabi, student portals, or lecturer directives.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">3.</span> Complete Disclaimer of Academic Outcomes &amp; Conduct
              </h2>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2 mb-3">
                <p className="font-semibold text-red-700 dark:text-red-300">
                  IMPORTANT NOTICE REGARDING GRADES, DEADLINES, AND ACADEMIC STANDING:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Zero Guarantee of Academic Results:</strong> Axon makes no guarantee, promise, or warranty that using the Service will result in improved grades, passing exams, GPA/CGPA gains, course retention, or degree completion.</li>
                  <li><strong>Missed Deadlines &amp; Exams:</strong> Under no circumstances shall Axon be held liable if you miss any assignment deadline, test, examination, lecture, or registration cutoff, regardless of whether caused by user error, notification delivery failure, software glitch, or offline caching delay.</li>
                  <li><strong>Academic Integrity Compliance:</strong> You are 100% solely responsible for adhering to your institution&apos;s Academic Regulations, Honor Codes, and Plagiarism Policies. Axon is not responsible for any penalties, grade reductions, suspensions, or expulsions imposed by your school.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">4.</span> Automated Features &amp; AI Study Helper Disclaimers
              </h2>
              <p className="mb-2">
                The Service incorporates automated artificial intelligence features (the AI Study Helper, OCR syllabus parsing, and grade estimators). You explicitly acknowledge that:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-2">
                <li>AI models are probabilistic and inherently experimental. Outputs may contain hallucinations, mathematical inaccuracies, incorrect formulas, or misleading logic.</li>
                <li>You are required to independently cross-check all equations, calculations, summaries, solutions, and citations against course textbooks and instructor guidance.</li>
                <li>Axon does not warrant the accuracy, safety, or suitability of any AI-generated response and shall not be held liable for erroneous academic work submitted by students.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">5.</span> Notifications &amp; Device Reliance
              </h2>
              <p className="mb-2">
                Automated timetable reminders and deadline notifications depend upon client-side operating systems (Android, iOS, Windows, macOS), browser permissions, battery-saving/Doze modes, and telecommunications network connectivity.
              </p>
              <p>
                <strong>No Warranty of Timely Delivery:</strong> Axon does not warrant that notifications will be delivered on time or at all. You must never rely upon Axon notifications as your sole reminder system for critical academic deadlines or examinations.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">6.</span> Account Security &amp; Unauthorized Access
              </h2>
              <p className="mb-2">
                You are responsible for maintaining the confidentiality of your login credentials and for all actions that occur under your account. You agree:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>To use a strong password and keep your devices protected against unauthorized access.</li>
                <li>To notify us immediately via our contact channels if you suspect unauthorized access or a security breach.</li>
                <li>That Axon will not be liable for any damage or loss arising from unauthorized access to your account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">7.</span> Data Loss, Backups &amp; Guest Sessions
              </h2>
              <p className="mb-2">
                Axon is not an archival storage provider. While cloud synchronization is implemented for registered users, network dropouts, cloud downtimes, or technical bugs can lead to data loss.
              </p>
              <p className="mb-2">
                <strong>Guest Mode Sessions:</strong> Guest sessions store records in browser local storage (<code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-xs">localStorage</code>). Clearing browser cache, using private browsing, or switching devices will permanently destroy unexported data with zero possibility of restoration.
              </p>
              <p>
                <strong>User Duty to Backup:</strong> You are expressly required to maintain independent offline backups of all vital academic schedules, assignments, and study materials. Axon disclaims any liability for lost or unrecoverable records.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">8.</span> Prohibited Conduct &amp; Acceptable Use
              </h2>
              <p className="mb-2">You agree NEVER to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>Upload, store, or transmit content that is unlawful, defamatory, harassing, abusive, or infringing on intellectual property.</li>
                <li>Attempt to gain unauthorized access to server infrastructure, database tables, or data belonging to other students.</li>
                <li>Attempt to decompile, reverse engineer, or bypass Row-Level Security (RLS) policies.</li>
                <li>Upload stolen examination papers, confidential answer keys, or copyrighted textbooks without authorization.</li>
                <li>Overburden or disrupt server infrastructure or third-party APIs with automated scrapers or high-frequency requests.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">9.</span> Third-Party Infrastructure &amp; APIs
              </h2>
              <p>
                Axon utilizes third-party cloud infrastructure (including Supabase for database hosting, Vercel for application hosting, Google for authentication, and foundation AI API providers). Axon has no control over the operation or uptime of these third-party systems and disclaims all liability for external outages, network failures, or upstream API disruptions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">10.</span> COMPLETE DISCLAIMER OF WARRANTIES
              </h2>
              <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-slate-900/80 p-4 text-xs font-mono uppercase tracking-wide text-slate-800 dark:text-slate-200 leading-relaxed">
                THE SERVICE, INCLUDING ALL SOFTWARE, FEATURES, AI ASSISTANTS, SCHEDULES, AND CONTENT, IS PROVIDED STRICTLY ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OR REPRESENTATIONS OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE FULLEST EXTENT PERMISSIBLE BY LAW, AXON AND ITS CREATORS, OPERATORS, AND AFFILIATES EXPRESSLY DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, SATISFACTORY QUALITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL OPERATE UNINTERRUPTED, BUG-FREE, OR ERROR-FREE.
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">11.</span> EXCLUSION OF CONSEQUENTIAL &amp; INDIRECT DAMAGES
              </h2>
              <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-slate-900/80 p-4 text-xs font-mono uppercase tracking-wide text-slate-800 dark:text-slate-200 leading-relaxed mb-3">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL AXON, ITS DEVELOPERS, FOUNDERS, OPERATORS, OR AGENTS BE LIABLE FOR ANY INDIRECT, CONSEQUENTIAL, INCIDENTAL, SPECIAL, EXEMPLARY, OR PUNITIVE LOSSES OR DAMAGES, INCLUDING LOSS OF DATA, LOSS OF PROFITS, ACADEMIC PENALTIES, MISSED EXAMINATIONS, SUSPENSION, EXPULSION, TUITION EXPENSES, OR EMOTIONAL DISTRESS, HOWSOEVER ARISING AND WHETHER IN CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE.
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">12.</span> EXCLUSION &amp; LIMITATION OF MONETARY LIABILITY
              </h2>
              <p>
                To the maximum extent permitted by applicable law, all monetary liability of Axon and its operators is wholly excluded. If, for any reason, a court of competent jurisdiction determines that liability cannot be excluded, our total aggregate monetary liability for any and all claims shall under no circumstances exceed the actual fees (if any) paid by you to Axon in the three (3) months immediately preceding the event, or zero for all free, trial, or guest users.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">13.</span> Indemnification
              </h2>
              <p>
                You agree to fully indemnify, defend, and hold harmless Axon, its developers, operators, and affiliates against any and all claims, liabilities, damages, losses, costs, and legal fees arising out of: (a) your use of or access to the Service; (b) your violation of these Terms; (c) your violation of any third-party rights, including intellectual property or academic honor codes; or (d) any unlawful conduct.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">14.</span> Modification &amp; Termination
              </h2>
              <p>
                We reserve the right, at our sole discretion, to modify, update, suspend, or discontinue the Service or any part thereof at any time without liability or advance notice. We may immediately suspend or terminate your account if we determine you have violated these Terms or engaged in conduct detrimental to the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">15.</span> Governing Law &amp; Dispute Resolution
              </h2>
              <p className="mb-2">
                These Terms and Conditions and any dispute or claim arising out of or in connection with them or their subject matter shall be governed by and construed in accordance with applicable laws, without giving effect to any conflict of law principles.
              </p>
              <p>
                <strong>Informal Resolution:</strong> You agree to first contact us in writing and attempt in good faith to resolve any dispute or grievance informally for at least thirty (30) days prior to initiating any formal legal proceedings.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">16.</span> Severability &amp; Entire Agreement
              </h2>
              <p>
                If any provision of these Terms is deemed unlawful, void, or for any reason unenforceable, that provision shall be deemed severable and shall not affect the validity and enforceability of any remaining provisions. These Terms, alongside our <Link to="/privacy" className="font-semibold text-theme-600 dark:text-theme-400 hover:underline">Privacy Policy</Link>, constitute the entire agreement between you and Axon.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">17.</span> Contact &amp; Inquiries
              </h2>
              <p>
                If you have questions regarding these Terms, please contact us via our{' '}
                <Link to="/contact" className="text-theme-600 dark:text-theme-400 font-semibold hover:underline">
                  Contact Form
                </Link>.
              </p>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
            <Link to="/privacy" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-theme-600 dark:hover:text-white">
              &rarr; Review Privacy Policy
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-ghost text-sm">
                Back to Sign In
              </Link>
              <Link to="/register" className="btn-primary text-sm">
                I Agree &bull; Get Started
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

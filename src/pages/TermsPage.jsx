import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import { Scale, AlertTriangle, ShieldCheck, FileText, Ban, CheckCircle2 } from 'lucide-react'

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
                Last modified: October 2026 &bull; Effective upon access or registration
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/privacy" className="btn-ghost text-sm">Privacy Policy</Link>
              <Link to="/login" className="btn-secondary text-sm">Sign In</Link>
            </div>
          </div>

          {/* Critical Disclaimer Highlights */}
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">As-Is Service</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Provided strictly &ldquo;as is&rdquo; without warranties of any kind, uptime guarantees, or error-free representations.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Ban className="h-5 w-5 text-red-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Academic Liability</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">We are not liable for missed deadlines, exam dates, GPA changes, or academic integrity infractions.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <ShieldCheck className="h-5 w-5 text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Malaysian Jurisdiction</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Governed strictly by the laws of Malaysia with total liability exclusions to the fullest extent of the law.</p>
            </div>
          </div>

          {/* Full Terms Content */}
          <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">1.</span> Binding Agreement &amp; Eligibility
              </h2>
              <p className="mb-2">
                These Terms and Conditions (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;Student&rdquo;, or &ldquo;You&rdquo;) and Axon (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, or the &ldquo;Operator&rdquo;) governing your access to and use of the Axon web application, progressive web app (PWA), and associated services (collectively, the &ldquo;Service&rdquo;).
              </p>
              <p>
                By creating an account, selecting &ldquo;Try as guest&rdquo;, or otherwise accessing the Service, you represent that you have read, understood, and agree to be bound by these Terms. If you are under 18 years of age (or the legal age of majority in your jurisdiction), you represent that you have reviewed these Terms with your parent or legal guardian and have received their permission to use the Service. <strong>If you do not agree to these Terms in their entirety, you are strictly prohibited from using the Service and must immediately discontinue access.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">2.</span> Nature of Service as an Organizational Aid
              </h2>
              <p className="mb-2">
                Axon is an auxiliary, self-managed digital organizational tool designed to help students track course schedules, assignment deadlines, exam timetables, study streaks, and study notes.
              </p>
              <p>
                <strong>Axon is NOT an official representative, affiliate, partner, or agent of your educational institution, university, college, exam board, or school.</strong> Information stored in or generated by Axon is user-entered or machine-processed and does not replace official university schedules, institutional notices, course syllabi, student portals, or professor instructions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">3.</span> Disclaimer of Academic Outcomes &amp; Integrity
              </h2>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2 mb-3">
                <p className="font-semibold text-red-700 dark:text-red-300">
                  IMPORTANT NOTICE REGARDING GRADES, DEADLINES, AND ACADEMIC CONDUCT:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>No Academic Guarantees:</strong> Axon makes no representation, warranty, or guarantee that using the Service will result in improved grades, passing exams, academic honors, admission into programs, GPA targets, or graduation.</li>
                  <li><strong>Missed Exams and Deadlines:</strong> Axon accepts zero liability if you miss an assignment deadline, test, quiz, exam, lecture, seminar, or registration window, regardless of whether such omission arose from user error, sync failure, reminder glitch, or device issue.</li>
                  <li><strong>Academic Honesty &amp; Honor Codes:</strong> You are 100% solely responsible for complying with your institution&apos;s academic integrity, honor code, and plagiarism regulations. Axon is not responsible for any disciplinary sanctions, suspensions, grade reductions, or expulsions resulting from your use of study materials, OCR extractions, or AI outputs.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">4.</span> AI Helper &amp; Automated Feature Disclaimers
              </h2>
              <p className="mb-2">
                The Service incorporates automated artificial intelligence features (the &ldquo;AI Study Helper&rdquo;, syllabus parsers, and GPA simulators). You explicitly acknowledge and agree that:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-2">
                <li>AI models are probabilistic and inherently experimental. Outputs may contain hallucinations, mathematical inaccuracies, logical fallacies, outdated facts, or misleading explanations.</li>
                <li>You must independently cross-verify all equations, answers, summaries, flashcards, and grade estimates against authoritative course textbooks and faculty guidance.</li>
                <li>Axon does not endorse, verify, or warrant the accuracy, completeness, or safety of any AI-generated response.</li>
                <li>You agree never to submit unedited AI-generated responses where prohibited by your school&apos;s assessment policy.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">5.</span> Push Notifications, Alarms &amp; Device Compatibility
              </h2>
              <p className="mb-2">
                While Axon offers scheduled notifications, reminders, and class alerts, successful delivery depends upon a complex chain of third-party factors outside our control, including your operating system (Android, iOS, Windows, macOS), browser permissions, battery-saving/Doze modes, network connectivity, and background app refresh settings.
              </p>
              <p>
                <strong>Axon DOES NOT guarantee timely or successful delivery of any notification or alarm.</strong> You must not rely on Axon as your sole reminder mechanism for high-stakes academic deadlines or examinations.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">6.</span> Account Security &amp; User Responsibility
              </h2>
              <p className="mb-2">
                You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>Choose a robust, unique password and utilize secure devices.</li>
                <li>Notify us immediately at our contact channels if you suspect unauthorized access or compromise.</li>
                <li>Refrain from sharing account access or transferring credentials to third parties.</li>
              </ul>
              <p className="mt-2">
                Axon will not be liable for any loss, damage, or unauthorized data disclosure resulting from your failure to safeguard your account.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">7.</span> Data Loss, Backups &amp; Guest Mode
              </h2>
              <p className="mb-2">
                Axon is not an archival storage or data backup provider. While we employ cloud database synchronization, technical faults, network interruptions, storage corruption, or software errors can result in data loss.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li><strong>Local / Guest Sessions:</strong> When operating in &ldquo;Guest Mode&rdquo;, data is stored in your device&apos;s browser memory. Clearing browser storage, private browsing resets, or switching browsers will permanently destroy unexported guest data.</li>
                <li><strong>User Backup Responsibility:</strong> You are strongly advised to keep independent, offline copies of all vital course schedules, assignments, and study materials. Axon is not liable for lost, corrupted, or unrecoverable student records.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">8.</span> Prohibited Conduct &amp; Acceptable Use
              </h2>
              <p className="mb-2">You agree NOT to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>Violate any local, national, or international law, regulation, or university policy.</li>
                <li>Upload, store, or transmit malicious code, viruses, worms, Trojan horses, or unauthorized bots/scrapers.</li>
                <li>Attempt to reverse engineer, decompile, bypass Row-Level Security (RLS), probe server vulnerabilities, or access data belonging to other students.</li>
                <li>Distribute pirated academic textbooks, stolen exam papers, confidential answer keys, or copyrighted works without authorization.</li>
                <li>Overburden, attack, or disrupt server infrastructure or third-party APIs with high-frequency automated requests.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">9.</span> Third-Party Services &amp; Dependencies
              </h2>
              <p>
                The Service relies upon third-party cloud hosting, database, authentication, and machine learning infrastructure (including Supabase Inc., Vercel Inc., Google Auth, and foundation AI API vendors). Axon has no control over the availability, policies, or operation of these third parties. Axon disclaims any liability for third-party service outages, network failures, API deprecations, or security incidents affecting external providers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">10.</span> COMPLETE DISCLAIMER OF ALL WARRANTIES
              </h2>
              <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-slate-900/80 p-4 text-xs font-mono uppercase tracking-wide text-slate-800 dark:text-slate-200 leading-relaxed">
                THE SERVICE, INCLUDING ALL SOFTWARE, FEATURES, AI ASSISTANTS, SCHEDULES, AND CONTENT, IS PROVIDED STRICTLY ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE FULLEST EXTENT PERMISSIBLE BY APPLICABLE LAW, AXON AND ITS CREATORS, OPERATORS, AFFILIATES, AND SUPPLIERS EXPRESSLY DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, TIMELINESS, SECURITY, AND ACCURACY. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, BUG-FREE, OR ERROR-FREE, NOR DO WE WARRANT THAT ANY DEFECTS WILL BE DETECTED OR CORRECTED.
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">11.</span> ABSOLUTE LIMITATION OF LIABILITY
              </h2>
              <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-slate-900/80 p-4 text-xs font-mono uppercase tracking-wide text-slate-800 dark:text-slate-200 leading-relaxed mb-3">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL AXON, ITS FOUNDERS, OPERATORS, DEVELOPERS, EMPLOYEES, CONTRACTORS, LICENSORS, OR PARTNERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES WHATSOEVER, INCLUDING WITHOUT LIMITATION:
                <br /><br />
                (A) DAMAGES FOR LOSS OF DATA, LOSS OF PROFITS, GOODWILL, TUITION FEES, SCHOLARSHIP ELIGIBILITY, OR ACADEMIC CREDIT;
                <br />
                (B) ANY MISSED EXAMS, DEADLINES, LATE SUBMISSIONS, ACADEMIC PENALTIES, COURSE EXPULSIONS, OR DISCIPLINARY PROCEEDINGS;
                <br />
                (C) ANY BUGS, VIRUSES, TROJAN HORSES, OR GLITCHES TRANSMITTED THROUGH THE SERVICE;
                <br />
                (D) ANY ERRORS, INACCURACIES, OR OMISSIONS IN TIMETABLES, GPA CALCULATIONS, OR AI-GENERATED OUTPUTS;
                <br />
                (E) UNAUTHORIZED ACCESS TO OR USE OF OUR SERVERS AND/OR ANY PERSONAL DATA STORED THEREIN.
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                THIS LIMITATION APPLIES REGARDLESS OF THE LEGAL THEORY (WHETHER CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE), EVEN IF AXON HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">12.</span> EXCLUSION &amp; LIMITATION OF MONETARY LIABILITY
              </h2>
              <p>
                To the fullest extent permitted under the laws of Malaysia, all liability of Axon, its founders, operators, and developers is wholly excluded. If, notwithstanding the other provisions of these Terms, Axon is determined to be liable to you under any cause of action, Axon&apos;s aggregate liability shall under no circumstances exceed the actual fees (if any) paid by you to Axon in the three (3) months immediately preceding the event, or <strong>RM 0 (Zero Ringgit Malaysia)</strong> for all free, trial, or guest users.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">13.</span> Indemnification
              </h2>
              <p>
                You agree to defend, indemnify, and hold harmless Axon, its creators, developers, operators, and affiliates from and against any and all claims, damages, obligations, losses, liabilities, costs, debts, and expenses (including reasonable attorney&apos;s fees) arising from: (a) your access to or use of the Service; (b) your violation of any provision of these Terms; (c) your violation of any third-party right, including intellectual property, privacy, or academic honor code rights; or (d) any claim that your uploaded notes or submitted content caused damage to a third party.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">14.</span> Modifications, Suspension &amp; Service Termination
              </h2>
              <p>
                We reserve the right, at our sole discretion and without liability or advance notice, to modify, update, suspend, or discontinue any feature or the entire Service at any time. We also reserve the right to immediately terminate or suspend your account if we determine you have breached these Terms or engaged in conduct detrimental to the Service or other students.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">15.</span> Governing Law, Dispute Resolution &amp; Jurisdiction
              </h2>
              <p className="mb-2">
                <strong>Governing Law:</strong> These Terms and Conditions, your access to and use of the Service, and all related matters shall be governed by, and construed exclusively in accordance with, the <strong>laws of Malaysia</strong>, without regard to conflict of law principles.
              </p>
              <p className="mb-2">
                <strong>Exclusive Jurisdiction:</strong> You irrevocably agree that the courts of Malaysia shall have exclusive jurisdiction to settle any dispute, controversy, difference, or claim arising out of or in connection with these Terms or the Service.
              </p>
              <p className="mb-2">
                <strong>Informal Resolution First:</strong> Prior to commencing any formal proceedings, you agree to contact us in writing and attempt in good faith to resolve the dispute amicably for a period of at least thirty (30) days.
              </p>
              <p>
                <strong>CLASS ACTION WAIVER:</strong> To the fullest extent permitted by Malaysian law, all proceedings to resolve disputes will be conducted strictly on an individual basis. You agree not to participate in any class, consolidated, or representative proceeding against Axon or its operators.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">16.</span> Severability &amp; Entire Agreement
              </h2>
              <p>
                If any provision of these Terms is deemed unlawful, void, or for any reason unenforceable, then that provision shall be deemed severable from these Terms and shall not affect the validity and enforceability of any remaining provisions. These Terms, alongside our <Link to="/privacy" className="font-semibold text-theme-600 dark:text-theme-400 hover:underline">Privacy Policy</Link>, constitute the entire agreement between you and Axon concerning the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">17.</span> Contacting Us
              </h2>
              <p>
                For questions regarding these Terms, please reach out via our{' '}
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

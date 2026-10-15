import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import { Scale, AlertTriangle, ShieldCheck, Ban, FileText, CheckCircle2 } from 'lucide-react'

export default function TermsPage() {
  return (
    <>
      <SEO
        title="Terms and Conditions of Use | Axon Malaysia"
        description="Terms and Conditions of Use for the Axon academic productivity platform, governed by the Laws of Malaysia."
        keywords="Axon Malaysia terms of use, student planner terms, Malaysia law, Contracts Act 1950, academic honesty"
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
                <Scale className="h-3.5 w-3.5" /> Laws of Malaysia Governed
              </div>
              <h1 className="text-3xl font-extrabold font-heading text-slate-950 dark:text-white">Terms and Conditions of Use</h1>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Last updated: October 2026 &bull; Formulated in accordance with the Laws of Malaysia
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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Provided &ldquo;As Is&rdquo;</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Provided strictly as a digital organizational aid without warranties, uptime guarantees, or error-free assurances.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Ban className="h-5 w-5 text-red-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Academic Liability</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">We accept zero liability for missed class timetables, exam deadlines, GPA outcomes, or disciplinary actions.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <ShieldCheck className="h-5 w-5 text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Malaysian Courts Jurisdiction</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Subject exclusively to the Laws of Malaysia and the jurisdiction of the Malaysian courts.</p>
            </div>
          </div>

          {/* Full Terms Content */}
          <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">1.</span> Binding Agreement &amp; Legal Capacity (Age of Majority Act 1971)
              </h2>
              <p className="mb-2">
                These Terms and Conditions (&ldquo;Terms&rdquo;) constitute a binding legal contract under the <strong>Contracts Act 1950 (Act 136)</strong> of Malaysia between you (&ldquo;User&rdquo;, &ldquo;Student&rdquo;, or &ldquo;You&rdquo;) and Axon (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, or the &ldquo;Operator&rdquo;), governing your access to and use of the Axon web application, progressive web app, and associated digital services (the &ldquo;Service&rdquo;).
              </p>
              <p className="mb-2">
                <strong>Legal Capacity:</strong> Under the <strong>Age of Majority Act 1971 (Act 21)</strong>, the age of majority in Malaysia is eighteen (18) years. If you are under 18 years of age, you represent and warrant that you have obtained the explicit permission, consent, and supervision of your parent or legal guardian to access and use the Service, and that your parent or legal guardian agrees to be bound by these Terms on your behalf.
              </p>
              <p>
                <strong>Electronic Formation:</strong> In accordance with Sections 7 and 8 of the <strong>Electronic Commerce Act 2006 (Act 658)</strong>, by clicking &ldquo;Get Started&rdquo;, registering an account, or continuing as a guest, you express your valid electronic consent to be bound by these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">2.</span> Scope of Service as a Private Self-Management Tool
              </h2>
              <p className="mb-2">
                Axon is an auxiliary, self-managed software tool designed to assist students with personal schedule planning, assignment organization, exam countdown tracking, study streak consistency, and note consolidation.
              </p>
              <p>
                <strong>Independence from Educational Institutions:</strong> Axon is an independent software application and is <strong>NOT</strong> an official representative, affiliate, partner, or agent of your university, college, secondary school, exam board, or educational institution. Information displayed in Axon is user-entered or machine-processed and does not supersede or replace official institutional timetables, exam venue notifications, student portal records, or lecturer directives.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">3.</span> Absolute Disclaimer of Academic Outcomes &amp; Conduct
              </h2>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2 mb-3">
                <p className="font-semibold text-red-700 dark:text-red-300">
                  IMPORTANT LEGAL NOTICE REGARDING GRADES, DEADLINES, AND ACADEMIC STANDING:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Zero Guarantee of Academic Results:</strong> Axon makes no representation, covenant, or warranty that using the Service will result in improved academic performance, passing grades, higher GPA/CGPA calculations, graduation completion, or course retention.</li>
                  <li><strong>Missed Deadlines &amp; Examinations:</strong> Under no circumstances shall Axon be held liable if you miss any assignment deadline, quiz, examination, class, seminar, or registration period, regardless of whether caused by user misconfiguration, software glitches, offline caching delays, or notification omissions.</li>
                  <li><strong>Academic Integrity Compliance:</strong> You bear 100% personal responsibility for adhering to your institution&apos;s Academic Regulations, Honor Codes, and Plagiarism Policies. Axon disclaims any liability for penalties, grade reductions, suspensions, or expulsions imposed by your university.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">4.</span> Automated Features &amp; AI Study Helper Disclaimer
              </h2>
              <p className="mb-2">
                The Service provides access to automated features, OCR document scanning, GPA estimators, and the AI Study Helper powered by generative machine learning models. You explicitly acknowledge that:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-2">
                <li>Generative AI models are probabilistic and experimental. Responses may contain factual hallucinations, calculation mistakes, incorrect formulas, or misleading logic.</li>
                <li>You are required to independently verify all academic calculations, summaries, solutions, and citations with certified course textbooks, lecture slides, and official faculty guidance.</li>
                <li>Axon does not warrant the accuracy, suitability, or correctness of any AI output and shall not be held liable for erroneous academic work submitted by students.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">5.</span> Notifications &amp; Device Reliance
              </h2>
              <p className="mb-2">
                Automated timetable reminders and deadline notifications rely upon client-side operating systems (Android, iOS, Windows, macOS), web browser notification permissions, power-saving/Doze routines, and mobile telecommunications networks.
              </p>
              <p>
                <strong>No Warranty of Timely Delivery:</strong> Axon does not warrant that notifications will be delivered punctually, accurately, or at all. You must never rely upon Axon notifications as your sole means of tracking examination schedules or critical submission cutoffs.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">6.</span> Account Security &amp; Unauthorized Access
              </h2>
              <p className="mb-2">
                You are responsible for keeping your login credentials confidential and for all actions conducted through your account. You agree:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>To use a strong password and secure your device against unauthorized physical or electronic access.</li>
                <li>To notify us immediately via our contact form if you discover unauthorized access or a security breach of your account.</li>
                <li>That Axon shall not be liable for any damage or loss arising from unauthorized use of your account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">7.</span> Data Loss, Backups &amp; Guest Sessions
              </h2>
              <p className="mb-2">
                Axon is not an archival storage facility or statutory repository. While cloud synchronization is implemented for registered users, network dropouts, cloud provider downtimes, or technical bugs can lead to data loss.
              </p>
              <p className="mb-2">
                <strong>Guest Mode Sessions:</strong> Guest sessions store records in browser local storage (<code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-xs">localStorage</code>). Clearing browser cache, using private browsing, or switching devices will permanently destroy unexported data with zero possibility of restoration.
              </p>
              <p>
                <strong>User Duty to Backup:</strong> You are expressly required to maintain independent backups of all vital academic schedules, assignment details, and course materials. Axon disclaims any liability for lost or unrecoverable records.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">8.</span> Prohibited Conduct (Communications and Multimedia Act 1998 &amp; Computer Crimes Act 1997)
              </h2>
              <p className="mb-2">
                You agree to comply strictly with the <strong>Communications and Multimedia Act 1998 (Act 588)</strong> and the <strong>Computer Crimes Act 1997 (Act 563)</strong>. You agree NEVER to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>Upload, store, or transmit content that is obscene, indecent, false, menacing, defamatory, or intended to harass or abuse any person (pursuant to Sections 211 and 233 of Act 588).</li>
                <li>Gain or attempt to gain unauthorized access to computer material, server databases, or data belonging to other students (pursuant to Section 3 of Act 563).</li>
                <li>Cause unauthorized modification or impairment of the Service, databases, or API infrastructure (pursuant to Section 5 of Act 563).</li>
                <li>Infringe intellectual property under the <strong>Copyright Act 1987 (Act 332)</strong> by uploading stolen examination leaks, pirated academic publications, or unauthorized institutional materials.</li>
                <li>Use automated scripts, bots, scrapers, or high-frequency requests that impair or degrade server operations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">9.</span> Third-Party Cloud Infrastructure &amp; APIs
              </h2>
              <p>
                Axon integrates third-party cloud infrastructure (including Supabase Inc. for database hosting, Vercel Inc. for application deployment, Google for OAuth authentication, and external enterprise AI APIs). Axon has no control over the operation, network routing, or uptime of these third-party systems and disclaims all liability for external outages, third-party network failures, or upstream API service disruptions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">10.</span> COMPLETE DISCLAIMER OF WARRANTIES (Consumer Protection Act 1999)
              </h2>
              <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-slate-900/80 p-4 text-xs font-mono uppercase tracking-wide text-slate-800 dark:text-slate-200 leading-relaxed">
                TO THE FULLEST EXTENT PERMISSIBLE UNDER THE LAWS OF MALAYSIA (INCLUDING THE CONSUMER PROTECTION ACT 1999 WHERE APPLICABLE), THE SERVICE IS PROVIDED STRICTLY ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OR REPRESENTATIONS OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR COLLATERAL. AXON AND ITS CREATORS, OPERATORS, AND AFFILIATES EXPRESSLY DISCLAIM ALL IMPLIED WARRANTIES OF MERCHANTABILITY, SATISFACTORY QUALITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL FUNCTION WITHOUT INTERRUPTION, DELAY, OR DEFECT, OR THAT SERVER ERRORS WILL BE CORRECTED.
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">11.</span> EXCLUSION OF CONSEQUENTIAL &amp; INDIRECT DAMAGES
              </h2>
              <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-slate-900/80 p-4 text-xs font-mono uppercase tracking-wide text-slate-800 dark:text-slate-200 leading-relaxed mb-3">
                TO THE MAXIMUM EXTENT PERMITTED BY THE LAWS OF MALAYSIA, IN NO EVENT SHALL AXON, ITS DEVELOPERS, FOUNDERS, OPERATORS, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY INDIRECT, CONSEQUENTIAL, INCIDENTAL, SPECIAL, EXEMPLARY, OR PUNITIVE LOSSES OR DAMAGES, INCLUDING LOSS OF DATA, LOSS OF PROFITS, ACADEMIC PENALTIES, MISSED EXAMINATIONS, SUSPENSION, EXPULSION, TUITION EXPENSES, OR EMOTIONAL DISTRESS, HOWSOEVER ARISING AND WHETHER IN CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR OTHERWISE.
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <strong>Statutory Saver:</strong> Nothing in these Terms shall limit or exclude any liability which cannot be lawfully excluded under Malaysian law, including liability for fraud, fraudulent misrepresentation, or death or personal injury resulting from proven gross negligence.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">12.</span> EXCLUSION &amp; LIMITATION OF MONETARY LIABILITY
              </h2>
              <p>
                To the maximum extent permitted by Malaysian law, all financial liability of Axon is wholly excluded. If, for any reason, a court of competent jurisdiction in Malaysia finds Axon or its operators liable, our aggregate monetary liability for any and all claims shall not exceed the actual subscription fees (if any) paid by you to Axon in the three (3) months immediately preceding the event giving rise to the claim, or <strong>RM 0.00 (Zero Ringgit Malaysia)</strong> for all free, guest, or trial users.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">13.</span> Indemnity
              </h2>
              <p>
                You agree to fully indemnify, defend, and hold harmless Axon, its developers, operators, and affiliates against any and all claims, liabilities, damages, losses, costs, and legal fees arising out of: (a) your use of or access to the Service; (b) your violation of these Terms; (c) your violation of any third-party rights, including intellectual property or academic honor codes; or (d) any unlawful conduct under Malaysian law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">14.</span> Modification &amp; Termination
              </h2>
              <p>
                We reserve the right, at our sole discretion, to modify, update, suspend, or discontinue the Service or any part thereof at any time without liability or advance notice. We may immediately suspend or terminate your account if we determine you have violated these Terms or applicable Malaysian laws.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">15.</span> Governing Law &amp; Exclusive Jurisdiction (Laws of Malaysia)
              </h2>
              <p className="mb-2">
                <strong>Governing Law:</strong> These Terms and Conditions, your relationship with Axon, and any dispute, controversy, or claim arising out of or related to the Service shall be governed by, and construed exclusively in accordance with, the <strong>laws of Malaysia</strong>.
              </p>
              <p className="mb-2">
                <strong>Exclusive Court Jurisdiction:</strong> You irrevocably agree that the <strong>courts of Malaysia</strong> shall have exclusive jurisdiction to settle any dispute or legal proceedings arising out of or in connection with these Terms or the Service.
              </p>
              <p>
                <strong>Amicable Resolution:</strong> You agree to first contact us in writing and attempt in good faith to resolve any dispute or grievance informally for at least thirty (30) days prior to initiating formal legal proceedings.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                <span className="font-heading text-theme-600 dark:text-theme-400">16.</span> Severability &amp; Entire Agreement
              </h2>
              <p>
                If any provision of these Terms is declared invalid or unenforceable by a Malaysian court of competent jurisdiction, that provision shall be severed to the minimum extent necessary, and the remaining provisions shall continue in full force and effect. These Terms, read together with our <Link to="/privacy" className="font-semibold text-theme-600 dark:text-theme-400 hover:underline">Privacy Policy (Notis Privasi)</Link>, constitute the entire agreement between you and Axon.
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
              &rarr; Review Privacy Policy (PDPA Notice)
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

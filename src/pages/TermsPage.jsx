import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <main className="h-screen overflow-y-auto bg-[radial-gradient(circle_at_top,#E0E7FF,#EEF4FB_55%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] dark:text-white px-4 py-10 transition-colors duration-300">
      <div className="mx-auto max-w-3xl glass rounded-2xl p-8 shadow-2xl mb-10">
        <div className="mb-8 flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <h1 className="text-2xl font-bold">Terms and Conditions</h1>
          <Link to="/login" className="btn-ghost text-sm">Back</Link>
        </div>
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">1. Introduction</h2>
            <p>Welcome to Axon. By accessing or using our website and application, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access the service.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">2. Use of Service</h2>
            <p>Axon provides tools to help students manage their academic life, including schedules, assignments, and reminders. You agree to use the service only for lawful educational and personal organization purposes.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">3. User Accounts</h2>
            <p>When you create an account, you must provide accurate and complete information. You are fully responsible for safeguarding your password and for all activities that occur under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">4. Data and Privacy</h2>
            <p>Your privacy is important to us. Axon stores the academic data you enter (such as timetables and assignments) securely, solely for the purpose of providing the service to you. We do not sell your personal data to third parties. By using Axon, you consent to the processing of your data as required to operate the application.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">5. Acceptable Use</h2>
            <p>You agree not to use the service to store or transmit malicious code, interfere with the integrity of the application, or attempt to gain unauthorized access to other user accounts or data.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">6. Intellectual Property</h2>
            <p>The service and its original content, features, and functionality are owned by Axon and are protected by international copyright, trademark, and other intellectual property laws.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">7. Changes to Terms</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide reasonable notice prior to any new terms taking effect.</p>
          </section>
        </div>
      </div>
    </main>
  )
}

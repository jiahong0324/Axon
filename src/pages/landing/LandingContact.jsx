import { useState } from 'react'
import { Mail, Clock, BookOpen, Send } from 'lucide-react'

function ContactLine({ icon: Icon, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-bold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  )
}

export default function LandingContact() {
  const [contactSent, setContactSent] = useState(false)

  function handleContactSubmit(e) {
    e.preventDefault()
    setContactSent(true)
    e.currentTarget.reset()
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[0.85fr_1fr] lg:items-start">
      <div>
        <p className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          Contact Us
        </p>
        <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl dark:text-white">
          Need help or want to suggest a blog topic?
        </h2>
        <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
          Send a message about account support, study features, article ideas, or anything that would make Axon more useful for students.
        </p>
        <div className="mt-8 space-y-4">
          <ContactLine icon={Mail} title="Email" desc="support@axon.app" />
          <ContactLine icon={Clock} title="Response time" desc="Usually within 1-2 business days" />
          <ContactLine icon={BookOpen} title="Blog topics" desc="Study planning, exams, assignments, AI learning, and student life" />
        </div>
      </div>

      <form onSubmit={handleContactSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/20 md:p-7">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Name</span>
            <input required className="min-h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white" placeholder="Your name" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Email</span>
            <input required type="email" className="min-h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white" placeholder="you@example.com" />
          </label>
        </div>
        <label className="mt-4 block space-y-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Message</span>
          <textarea required rows="6" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white" placeholder="Tell us how we can help." />
        </label>
        <button className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
          Send Message <Send className="h-4 w-4" />
        </button>
        {contactSent && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            Message received. This demo form is ready for backend email handling later.
          </p>
        )}
      </form>
    </section>
  )
}

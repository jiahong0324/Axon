import { ChevronDown } from 'lucide-react'
import { SectionIntro } from './LandingShared'
import SEO from '../../components/SEO'
import { faqs } from '../../data/faqs'

export { faqs }

function FaqItem({ item }) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-extrabold text-slate-950 dark:text-white">
        {item.question}
        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">{item.answer}</p>
    </details>
  )
}

export default function LandingFAQ() {
  return (
    <>
      <SEO
        title="Frequently Asked Questions | Axon"
        description="Find answers to common student questions about Axon timetables, assignment tracking, data privacy, and AI study help."
        keywords="Axon FAQ, student planner help, timetable support, student data privacy, exam reminder guide"
      />
      <section className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
      <SectionIntro
        eyebrow="FAQ"
        title="Questions students usually ask"
        desc="A quick guide to what Axon does and how it supports everyday academic planning."
        centered
      />
      <div className="mt-10 space-y-3">
        {faqs.map(item => <FaqItem key={item.question} item={item} />)}
      </div>
    </section>
  </>
  )
}

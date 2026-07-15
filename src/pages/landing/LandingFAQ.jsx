import { ChevronDown } from 'lucide-react'
import { SectionIntro } from './LandingShared'

export const faqs = [
  {
    question: 'What is Axon?',
    answer: 'Axon is a student productivity platform that brings your timetable, assignments, exams, reminders, study articles, and AI learning support into one organized workspace.'
  },
  {
    question: 'Is Axon only for students?',
    answer: 'Yes. This version of Axon is focused on helping students manage academic life more clearly and consistently.'
  },
  {
    question: 'Can I track assignments and exams?',
    answer: 'Yes. You can manage assignment deadlines, priorities, progress, exam dates, venues, notes, and preparation reminders.'
  },
  {
    question: 'Does Axon support reminders?',
    answer: 'Yes. Axon supports reminders for classes, exams, assignments, and personal study routines, depending on your preferences.'
  },
  {
    question: 'Can I switch between light and dark mode?',
    answer: 'Yes. Axon opens in light mode by default, and you can switch to dark mode anytime. Your choice is saved for future visits.'
  },
  {
    question: 'What is the blog for?',
    answer: 'The blog is designed for study tips, productivity guides, exam strategies, and practical academic advice for students.'
  },
  {
    question: 'How does the AI Helper work?',
    answer: 'The AI Helper is a built-in assistant that can help you understand complex topics, generate study schedules, brainstorm essay ideas, and answer academic questions in real-time.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. Your data is securely stored and protected. We use industry-standard encryption and security practices to ensure your academic records and personal notes remain private.'
  },
  {
    question: 'Can I use Axon on my phone?',
    answer: 'Absolutely! Axon is fully responsive and designed to work seamlessly across your laptop, tablet, and smartphone. You can also install it as a Web App to your home screen.'
  },
  {
    question: 'How do I contact support or request a feature?',
    answer: 'You can reach out to us using the Contact Us form on this website, or use the "Send Feedback" button directly from your student dashboard once you are logged in.'
  }
]

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
  )
}

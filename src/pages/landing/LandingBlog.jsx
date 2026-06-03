import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { SectionIntro } from './LandingShared'
import { blogPosts } from '../../data/blogPosts'

function BlogCard({ post, searchStr }) {
  return (
    <article className="flex min-h-[260px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80 dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-black/20">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">{post.category}</span>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{post.readTime}</span>
      </div>
      <h3 className="text-xl font-extrabold leading-snug text-slate-950 dark:text-white">{post.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{post.desc}</p>
      <Link to={`/blog/${post.slug}${searchStr}`} className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200">
        Read Article <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  )
}

export default function LandingBlog() {
  const { searchStr } = useOutletContext()

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionIntro
          eyebrow="Blog"
          title="Learn better with Axon Blog"
          desc="A student-focused article hub for productivity habits, deadline planning, exam preparation, and healthier study routines."
        />
        <Link to={`/contact${searchStr}`} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10">
          Request a topic <MessageCircle className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {blogPosts.map(post => <BlogCard key={post.title} post={post} searchStr={searchStr} />)}
      </div>
    </section>
  )
}

import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, MessageCircle, Heart } from 'lucide-react'
import { SectionIntro } from './LandingShared'
import { supabase } from '../../lib/supabase'

const categoryColors = {
  'Study Planning': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  'Deadlines': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  'Exam Prep': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'Productivity': 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  'Study Skills': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'Mental Health': 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  'Health & Habits': 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  'Teamwork': 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  'Time Management': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
}

function getCategoryColor(category) {
  return categoryColors[category] || 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200'
}

function BlogCard({ post, searchStr }) {
  return (
    <article className="flex min-h-[380px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80 dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-black/20">
      {post.image_url && (
        <div className="h-48 w-full overflow-hidden border-b border-slate-100 dark:border-white/5">
          <img src={post.image_url} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${getCategoryColor(post.category)}`}>
            {post.category}
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{post.read_time}</span>
        </div>
        <h3 className="text-xl font-extrabold leading-snug text-slate-950 dark:text-white">{post.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 line-clamp-3 dark:text-slate-400">{post.description}</p>
        <div className="mt-6 flex items-center justify-between">
          <Link to={`/blog/${post.slug}${searchStr}`} className="inline-flex items-center gap-2 text-sm font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200">
            Read Article <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
            <Heart className="h-4 w-4 fill-slate-300 stroke-slate-300 dark:fill-slate-700 dark:stroke-slate-700" />
            {post.likes_count || 0}
          </div>
        </div>
      </div>
    </article>
  )
}

export default function LandingBlog() {
  const { searchStr } = useOutletContext()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')

  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
      if (data) setPosts(data)
      setLoading(false)
    }
    fetchPosts()
  }, [])

  const categories = ['All', ...new Set(posts.map(p => p.category))]
  const filteredPosts = selectedCategory === 'All' ? posts : posts.filter(p => p.category === selectedCategory)

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
      
      {loading ? (
        <div className="mt-10 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
      ) : (
        <>
          {posts.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-6 dark:border-white/10">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                    selectedCategory === cat 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPosts.map(post => <BlogCard key={post.id} post={post} searchStr={searchStr} />)}
          </div>
          {filteredPosts.length === 0 && posts.length > 0 && (
            <div className="mt-20 text-center text-slate-500 dark:text-slate-400">
              No articles found for this category.
            </div>
          )}
        </>
      )}
    </section>
  )
}

import { useState, useEffect } from 'react'
import { useParams, Link, useOutletContext, Navigate } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function LandingArticle() {
  const { slug } = useParams()
  const { searchStr } = useOutletContext()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchPost() {
      const { data } = await supabase.from('blog_posts').select('*').eq('slug', slug).single()
      setPost(data)
      setLoading(false)
    }
    fetchPost()
  }, [slug])
  
  if (loading) {
    return (
      <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </article>
    )
  }

  if (!post) {
    return <Navigate to={`/blog${searchStr}`} replace />
  }

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
      <Link to={`/blog${searchStr}`} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400">
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </Link>
      
      <header className="mb-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
            {post.category}
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <Clock className="h-4 w-4" /> {post.readTime}
          </span>
        </div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl dark:text-white">
          {post.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          {post.desc}
        </p>
      </header>

      <div className="prose prose-slate prose-lg max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-extrabold prose-a:text-blue-600 dark:prose-a:text-blue-400">
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </article>
  )
}

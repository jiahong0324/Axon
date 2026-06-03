import { useState, useEffect } from 'react'
import { useParams, Link, useOutletContext, Navigate } from 'react-router-dom'
import { ArrowLeft, Clock, Share2, Heart, MessageSquare, Send, Eye, Reply } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'

export default function LandingArticle() {
  const { slug } = useParams()
  const { searchStr } = useOutletContext()
  const { showToast } = useToast()
  
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  
  const [comments, setComments] = useState([])
  const [commentName, setCommentName] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const [replyingTo, setReplyingTo] = useState(null)
  const [replyName, setReplyName] = useState('')
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  
  useEffect(() => {
    async function fetchPost() {
      const { data } = await supabase.from('blog_posts').select('*').eq('slug', slug).single()
      if (data) {
        setPost(data)
        setLikesCount(data.likes_count || 0)
        
        // Fetch comments
        const { data: commentsData } = await supabase
          .from('blog_comments')
          .select('*')
          .eq('post_id', data.id)
          .order('created_at', { ascending: false })
          
        if (commentsData) setComments(commentsData)
        
        supabase.rpc('increment_blog_view', { post_id: data.id }).then()
      }
      setLoading(false)
    }
    fetchPost()
  }, [slug])
  
  async function handleLike() {
    if (liked || !post) return
    setLiked(true)
    setLikesCount(prev => prev + 1)
    await supabase.rpc('increment_blog_like', { post_id: post.id })
  }
  
  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    showToast('Link copied to clipboard!', 'success')
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!commentName.trim() || !commentText.trim() || !post) return
    
    setSubmittingComment(true)
    const newComment = {
      post_id: post.id,
      name: commentName.trim(),
      content: commentText.trim()
    }
    
    const { data, error } = await supabase.from('blog_comments').insert(newComment).select().single()
    if (!error && data) {
      setComments([data, ...comments])
      setCommentText('')
      showToast('Comment posted successfully', 'success')
    } else {
      showToast('Failed to post comment', 'error')
    }
    setSubmittingComment(false)
  }

  async function submitReply(e, parentId) {
    e.preventDefault()
    if (!replyName.trim() || !replyText.trim() || !post) return
    
    setSubmittingReply(true)
    const newReply = {
      post_id: post.id,
      parent_id: parentId,
      name: replyName.trim(),
      content: replyText.trim()
    }
    
    const { data, error } = await supabase.from('blog_comments').insert(newReply).select().single()
    if (!error && data) {
      setComments([...comments, data]) // append reply so it appears at bottom of thread
      setReplyText('')
      setReplyingTo(null)
      showToast('Reply posted successfully', 'success')
    } else {
      showToast('Failed to post reply', 'error')
    }
    setSubmittingReply(false)
  }

  const topLevelComments = comments.filter(c => !c.parent_id)
  
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
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
            {post.category}
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <Clock className="h-4 w-4" /> {post.read_time}
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <Eye className="h-4 w-4" /> {post.views_count || 0}
          </span>
        </div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl dark:text-white">
          {post.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          {post.description}
        </p>
      </header>

      {post.image_url && (
        <div className="mb-12 overflow-hidden rounded-3xl border border-slate-200 shadow-sm dark:border-white/10">
          <img src={post.image_url} alt={post.title} className="w-full object-cover" />
        </div>
      )}

      <div className="prose prose-slate prose-lg max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-extrabold prose-a:text-blue-600 dark:prose-a:text-blue-400">
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
      
      <div className="mt-16 flex items-center justify-center gap-4 border-t border-slate-200 pt-8 dark:border-white/10">
        <button
          onClick={handleLike}
          disabled={liked}
          className={`flex items-center gap-2 rounded-full border px-6 py-3 font-bold transition ${
            liked 
              ? 'border-pink-200 bg-pink-50 text-pink-600 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-400' 
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5'
          }`}
        >
          <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
          {likesCount} Likes
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
        >
          <Share2 className="h-5 w-5" /> Share
        </button>
      </div>

      <section className="mt-20">
        <div className="mb-8 flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <MessageSquare className="h-6 w-6 text-slate-400" />
          <h2 className="font-heading text-2xl font-extrabold text-slate-950 dark:text-white">
            Comments ({comments.length})
          </h2>
        </div>

        <form onSubmit={submitComment} className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-900/50">
          <h3 className="mb-4 text-sm font-bold text-slate-950 dark:text-white">Leave a comment</h3>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Your Name"
              required
              value={commentName}
              onChange={e => setCommentName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="mb-4">
            <textarea
              placeholder="What are your thoughts?"
              required
              rows={4}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submittingComment || !commentName.trim() || !commentText.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:px-8"
          >
            {submittingComment ? 'Posting...' : 'Post Comment'} <Send className="h-4 w-4" />
          </button>
        </form>

        <div className="space-y-6">
          {topLevelComments.map(comment => (
            <div key={comment.id} className="flex flex-col gap-4">
              {/* Top-Level Comment */}
              <div className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {comment.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-950 dark:text-white">{comment.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {comment.content}
                  </p>
                  <button 
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                  >
                    <Reply className="h-3 w-3" /> {replyingTo === comment.id ? 'Cancel' : 'Reply'}
                  </button>
                </div>
              </div>

              {/* Replies */}
              {comments.filter(r => r.parent_id === comment.id).map(reply => (
                <div key={reply.id} className="ml-8 flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 shadow-sm md:ml-12 dark:border-white/5 dark:bg-slate-900/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200/50 font-bold text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                    {reply.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-950 dark:text-white">{reply.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(reply.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {reply.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <form onSubmit={(e) => submitReply(e, comment.id)} className="ml-8 mt-2 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-5 md:ml-12 dark:border-blue-500/20 dark:bg-blue-900/10">
                  <input
                    type="text"
                    placeholder="Your Name"
                    required
                    value={replyName}
                    onChange={e => setReplyName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  />
                  <textarea
                    placeholder="Write a reply..."
                    required
                    rows={2}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReply || !replyName.trim() || !replyText.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submittingReply ? 'Posting...' : 'Post Reply'} <Send className="h-3 w-3" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-center text-slate-500 dark:text-slate-400">
              No comments yet. Be the first to share your thoughts!
            </p>
          )}
        </div>
      </section>
    </article>
  )
}

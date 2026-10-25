import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ManagerBlogPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPost, setEditingPost] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
    if (data) setPosts(data)
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setIsSaving(true)
    
    const formData = new FormData(e.currentTarget)
    const postData = {
      title: formData.get('title'),
      slug: formData.get('slug'),
      category: formData.get('category'),
      description: formData.get('description'),
      read_time: formData.get('read_time'),
      image_url: formData.get('image_url'),
      content: formData.get('content')
    }

    if (editingPost.id) {
      // Update existing
      const { error } = await supabase.from('blog_posts').update(postData).eq('id', editingPost.id)
      if (!error) {
        setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...postData } : p))
        setEditingPost(null)
      } else {
        alert(error.message)
      }
    } else {
      // Create new
      const { data: userData } = await supabase.auth.getUser()
      postData.author_id = userData?.user?.id
      
      const { data, error } = await supabase.from('blog_posts').insert([postData]).select()
      if (!error && data) {
        setPosts([data[0], ...posts])
        setEditingPost(null)
      } else {
        alert(error?.message || 'Error creating post')
      }
    }
    
    setIsSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this blog post?')) return
    await supabase.from('blog_posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <main className="main-content">
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="page-title">Blog Posts</h1>
          <p className="text-slate-400">Manage the articles displayed on the public landing page.</p>
        </div>
        <button 
          onClick={() => setEditingPost({ title: '', slug: '', category: '', description: '', read_time: '', image_url: '', content: '' })}
          className="btn-primary"
        >
          <Plus className="h-5 w-5" /> New Post
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-theme-500 border-t-transparent" /></div>
      ) : posts.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">No blog posts found.</div>
      ) : (
        <div className="grid gap-4">
          {posts.map(post => (
            <div key={post.id} className="card flex items-center justify-between p-5">
              <div>
                <h3 className="font-bold text-white">{post.title}</h3>
                <div className="mt-1 flex items-center gap-3 text-sm text-slate-400">
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-theme-300">{post.category}</span>
                  <span>{post.read_time}</span>
                  <span className="hidden md:inline">• /{post.slug}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingPost(post)} className="btn-ghost p-2 text-slate-300 hover:text-theme-400">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(post.id)} className="btn-ghost p-2 text-slate-300 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-navy-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editingPost.id ? 'Edit Post' : 'New Post'}</h2>
              <button onClick={() => setEditingPost(null)} className="btn-ghost p-2"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-300">
                  Title
                  <input required name="title" defaultValue={editingPost.title} className="input mt-1 w-full" placeholder="Post title" />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-300">
                  Slug
                  <input required name="slug" defaultValue={editingPost.slug} className="input mt-1 w-full" placeholder="url-friendly-slug" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-300">
                  Category
                  <input required name="category" defaultValue={editingPost.category} className="input mt-1 w-full" placeholder="e.g. Study Planning" />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-300">
                  Read Time
                  <input required name="read_time" defaultValue={editingPost.read_time} className="input mt-1 w-full" placeholder="e.g. 5 min read" />
                </label>
              </div>
              <label className="space-y-1 text-sm font-medium text-slate-300">
                Description (shown on cards)
                <textarea required name="description" defaultValue={editingPost.description} rows="2" className="input mt-1 w-full" />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-300">
                Cover Image URL (Optional)
                <input name="image_url" defaultValue={editingPost.image_url} className="input mt-1 w-full" placeholder="e.g. /blog/my-image.png or https://..." />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-300">
                Content (HTML)
                <textarea required name="content" defaultValue={editingPost.content} rows="10" className="input mt-1 w-full font-mono text-xs" />
              </label>
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingPost(null)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isSaving} className="btn-primary">
                  {isSaving ? 'Saving...' : <><Save className="h-4 w-4" /> Save Post</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

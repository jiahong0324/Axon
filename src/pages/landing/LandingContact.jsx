import { useRef, useState, useEffect } from 'react'
import { Mail, Clock, BookOpen, Send, ImageIcon, UploadCloud, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import SEO from '../../components/SEO'
import { processFeedbackImage, submitFeedbackWithImage } from '../../lib/feedbackImage'

function ContactLine({ icon: Icon, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-50 text-theme-700 dark:bg-theme-500/10 dark:text-theme-300">
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // Listen for paste events in the contact form
  useEffect(() => {
    async function handlePaste(e) {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            e.preventDefault()
            await handleImageFile(file, `contact_pasted_${Date.now()}.png`)
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  async function handleImageFile(file, customName = null) {
    if (!file) return
    setImageError('')
    setIsProcessingImage(true)

    try {
      if (customName && !file.name) {
        file = new File([file], customName, { type: file.type })
      }
      const processed = await processFeedbackImage(file)
      setSelectedImage(processed)
    } catch (err) {
      setImageError(err.message || 'Could not process image.')
    } finally {
      setIsProcessingImage(false)
    }
  }

  function handleFileInputChange(e) {
    const file = e.target.files?.[0]
    if (file) handleImageFile(file)
  }

  function removeImage() {
    setSelectedImage(null)
    setImageError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleContactSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    // Check if there's a logged-in user to attach the user_id, otherwise anonymous
    const { data: { session } } = await supabase.auth.getSession()

    try {
      await submitFeedbackWithImage({
        userId: session?.user?.id || null,
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
        processedImage: selectedImage
      })

      setContactSent(true)
      setSelectedImage(null)
      e.currentTarget.reset()
    } catch (err) {
      console.error('Contact submission error:', err)
      setImageError(err.message || 'Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <SEO
        title="Contact Us & Support | Axon"
        description="Have a question about Axon or want to suggest a new student feature? Reach out to our team."
        keywords="Axon contact, student app support, study platform feedback, academic planner inquiries"
      />
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[0.85fr_1fr] lg:items-start">
      <div>
        <p className="mb-4 inline-flex rounded-full bg-theme-50 px-4 py-2 text-sm font-bold text-theme-700 dark:bg-theme-500/10 dark:text-theme-300">
          Contact Us
        </p>
        <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl dark:text-white">
          Need help or want to suggest a feature?
        </h2>
        <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
          Send a message about account support, study features, bug reports, article ideas, or anything that would make Axon more useful for students. You can also attach screenshots!
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
            <input required name="name" className="min-h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-950 outline-none transition focus:border-theme-500 focus:ring-4 focus:ring-theme-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white" placeholder="Your name" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Email</span>
            <input required type="email" name="email" className="min-h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-950 outline-none transition focus:border-theme-500 focus:ring-4 focus:ring-theme-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white" placeholder="you@example.com" />
          </label>
        </div>
        <label className="mt-4 block space-y-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Message</span>
          <textarea required rows="5" name="message" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-theme-500 focus:ring-4 focus:ring-theme-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white" placeholder="Tell us how we can help or describe the issue." />
        </label>

        {/* Screenshot / Image Attachment Field */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-theme-500" />
              <span>Attach Screenshot / Image (Optional)</span>
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {isProcessingImage ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-theme-500/40 bg-theme-500/5 p-4 text-xs text-theme-600 dark:text-theme-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Optimizing image...</span>
            </div>
          ) : selectedImage ? (
            <div className="flex items-center justify-between rounded-xl border border-theme-500/30 bg-theme-500/5 p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={selectedImage.dataUrl} alt="Screenshot" className="h-10 w-12 rounded object-cover border border-white/10" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{selectedImage.fileName}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ready to send
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeImage}
                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
              onDrop={(e) => {
                e.preventDefault()
                setDragActive(false)
                const file = e.dataTransfer?.files?.[0]
                if (file) handleImageFile(file)
              }}
              className={`cursor-pointer rounded-xl border border-dashed p-3 text-center transition-all ${
                dragActive
                  ? 'border-theme-500 bg-theme-500/10'
                  : 'border-slate-300 dark:border-white/10 hover:border-theme-500 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <UploadCloud className="h-4 w-4 text-theme-500" />
                <span>Upload screenshot or paste (<kbd className="rounded bg-black/10 px-1 py-0.5 text-[10px] dark:bg-white/10">Ctrl+V</kbd>)</span>
              </div>
            </div>
          )}

          {imageError && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{imageError}</span>
            </p>
          )}
        </div>

        <button disabled={isSubmitting || isProcessingImage} className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-theme-600 px-6 font-bold text-white shadow-lg shadow-theme-600/20 transition hover:bg-theme-700 disabled:opacity-50">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <span>Send Message</span>
              <Send className="h-4 w-4" />
            </>
          )}
        </button>
        {contactSent && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            Message received! Our team will get back to you shortly.
          </p>
        )}
      </form>
    </section>
  </>
  )
}

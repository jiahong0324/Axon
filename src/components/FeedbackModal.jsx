import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  Loader2,
  Send,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react'
import Modal from './Modal'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { processFeedbackImage, submitFeedbackWithImage } from '../lib/feedbackImage'

export default function FeedbackModal({ isOpen, onClose }) {
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)
  const { showToast } = useToast()

  // Load current authenticated user on open
  useEffect(() => {
    if (!isOpen) {
      resetForm()
      return
    }

    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
        if (user) {
          setName(user.user_metadata?.full_name || '')
          setEmail(user.email || '')
        }
      } catch (err) {
        console.warn('Auth check in FeedbackModal:', err)
      }
    }

    checkAuth()
  }, [isOpen])

  // Clipboard paste listener: allows users to take a screenshot and Ctrl+V / Cmd+V directly
  useEffect(() => {
    if (!isOpen) return

    async function handlePaste(e) {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            e.preventDefault()
            await handleImageFile(file, `screenshot_pasted_${Date.now()}.png`)
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [isOpen])

  function resetForm() {
    setMessage('')
    setSelectedImage(null)
    setImageError('')
    setDragActive(false)
    setLoading(false)
    setIsProcessingImage(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
      setImageError(err.message || 'Could not process image. Please try another.')
    } finally {
      setIsProcessingImage(false)
    }
  }

  function handleFileInputChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      handleImageFile(file)
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) {
      handleImageFile(file)
    }
  }

  function removeImage() {
    setSelectedImage(null)
    setImageError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim() && !selectedImage) {
      showToast('Please enter a message or attach a screenshot.', 'error')
      return
    }

    setLoading(true)

    try {
      await submitFeedbackWithImage({
        userId: currentUser?.id || null,
        message: message.trim(),
        name: currentUser?.user_metadata?.full_name || name.trim() || undefined,
        email: currentUser?.email || email.trim() || undefined,
        processedImage: selectedImage
      })

      showToast('Feedback sent! Thank you for helping us improve Axon.', 'success')
      resetForm()
      onClose()
    } catch (err) {
      console.error('Failed to submit feedback:', err)
      showToast(err.message || 'Could not send feedback. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Feedback" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* If guest/anonymous, prompt for contact info */}
        {!currentUser && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label text-xs">Name (optional)</label>
              <input
                type="text"
                className="input py-2 text-sm"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-xs">Email (optional)</label>
              <input
                type="email"
                className="input py-2 text-sm"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Message Input */}
        <div>
          <label className="label text-xs">Message</label>
          <textarea
            className="input min-h-[110px] text-sm leading-relaxed"
            placeholder="Tell us what happened or how we can improve..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            required={!selectedImage}
            autoFocus
          />
        </div>

        {/* Image Upload / Attachment Section */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label text-xs">Screenshot (optional)</label>
            {selectedImage && (
              <button
                type="button"
                onClick={removeImage}
                className="text-xs text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {isProcessingImage ? (
            <div className="flex items-center justify-center gap-2.5 rounded-xl border border-dashed border-theme-500/30 bg-theme-500/5 py-4 text-xs text-theme-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Optimizing image...</span>
            </div>
          ) : selectedImage ? (
            /* Attached Image Preview Card */
            <div className="relative overflow-hidden rounded-xl border border-theme-500/30 bg-slate-900/50 p-2.5 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black flex items-center justify-center">
                  <img
                    src={selectedImage.dataUrl}
                    alt="Screenshot preview"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs sm:text-sm font-medium text-white">
                      {selectedImage.fileName}
                    </p>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Attached
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {formatBytes(selectedImage.fileSize)}
                    {selectedImage.width && ` • ${selectedImage.width}×${selectedImage.height}px`}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors shrink-0"
                    title="Change image"
                  >
                    <FileImage className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors shrink-0"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Drop Area */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed py-3.5 px-4 text-center transition-all ${
                dragActive
                  ? 'border-theme-500 bg-theme-500/10 scale-[1.01]'
                  : 'border-slate-300 dark:border-white/10 hover:border-theme-500/40 hover:bg-white/[0.02]'
              }`}
            >
              <UploadCloud className="h-4 w-4 text-slate-400 group-hover:text-theme-400 transition-colors shrink-0" />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Upload image or paste <kbd className="rounded bg-black/20 dark:bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">Ctrl+V</kbd>
              </span>
            </div>
          )}

          {imageError && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{imageError}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-ghost flex-1 py-2.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || isProcessingImage || (!message.trim() && !selectedImage)}
            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send Feedback</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

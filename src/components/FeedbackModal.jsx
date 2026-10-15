import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  ImageIcon,
  Loader2,
  MessageSquare,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Send Feedback" maxWidth="max-w-lg">
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-theme-500/20 bg-theme-500/10 p-3.5">
        <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-theme-600 dark:text-theme-400" />
        <div className="text-xs sm:text-sm text-theme-800 dark:text-theme-200">
          <p className="font-medium">Have a suggestion, found a bug, or need help?</p>
          <p className="mt-0.5 text-theme-700/80 dark:text-theme-300/80">
            Attach a screenshot or image below so admins can quickly pinpoint and resolve the issue.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* If guest/anonymous, prompt for contact info */}
        {!currentUser && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label text-xs">Your Name (optional)</span>
              <input
                type="text"
                className="input py-2 text-sm"
                placeholder="e.g. Alex Tan"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label text-xs">Your Email (optional)</span>
              <input
                type="email"
                className="input py-2 text-sm"
                placeholder="e.g. alex@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </label>
          </div>
        )}

        {/* Message Input */}
        <label className="block">
          <div className="flex items-center justify-between">
            <span className="label">Describe the problem or suggestion</span>
            <span className="text-[11px] text-slate-400">
              {message.length} chars
            </span>
          </div>
          <textarea
            className="input min-h-[105px] text-sm leading-relaxed"
            placeholder="What happened? What did you expect? Or what feature would make Axon better for you?"
            value={message}
            onChange={e => setMessage(e.target.value)}
            required={!selectedImage}
            autoFocus
          />
        </label>

        {/* Image Upload / Attachment Section */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label text-xs flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-theme-500" />
              <span>Attach Image / Screenshot (Recommended)</span>
            </label>
            {selectedImage && (
              <button
                type="button"
                onClick={removeImage}
                className="text-xs text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove image
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
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-theme-500/40 bg-theme-500/5 p-6 text-sm text-theme-600 dark:text-theme-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Optimizing screenshot image...</span>
            </div>
          ) : selectedImage ? (
            /* Attached Image Preview Card */
            <div className="relative overflow-hidden rounded-2xl border border-theme-500/30 bg-slate-900/50 p-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black flex items-center justify-center">
                  <img
                    src={selectedImage.dataUrl}
                    alt="Feedback screenshot preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {selectedImage.fileName}
                    </p>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Attached
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatBytes(selectedImage.fileSize)}
                    {selectedImage.width && ` • ${selectedImage.width}×${selectedImage.height}px`}
                  </p>
                  <p className="mt-1 text-[11px] text-theme-400">
                    Screenshot ready for review by admin
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                    title="Change Image"
                  >
                    <FileImage className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    title="Remove Image"
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
              className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                dragActive
                  ? 'border-theme-500 bg-theme-500/10 scale-[1.01]'
                  : 'border-slate-300 dark:border-white/10 hover:border-theme-500/50 hover:bg-white/[0.02]'
              }`}
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-theme-500/10 text-theme-600 dark:text-theme-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                Click to upload screenshot or drag & drop here
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Supports PNG, JPG, WEBP, GIF (up to 15MB) • You can also paste directly (<kbd className="rounded bg-black/20 px-1 py-0.5 text-[10px]">Ctrl+V</kbd>)
              </p>
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
            className="btn-ghost flex-1 py-2.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || isProcessingImage || (!message.trim() && !selectedImage)}
            className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
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

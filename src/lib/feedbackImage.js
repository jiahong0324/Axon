import { supabase } from './supabase'

/**
 * Validates and compresses an image for feedback attachment.
 * Resizes images exceeding maxDimension while preserving aspect ratio.
 * High-quality JPEG compression preserves text legibility in screenshots.
 */
export async function processFeedbackImage(file, maxDimension = 1600, quality = 0.85) {
  if (!file) return null

  // Ensure it's an image
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (PNG, JPG, WEBP, or GIF).')
  }

  // 15MB limit before compression
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image size must be less than 15MB.')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Failed to read image file.'))

    reader.onload = (e) => {
      const img = new Image()

      img.onerror = () => reject(new Error('Failed to load image data.'))

      img.onload = () => {
        let { width, height } = img

        // Scale down if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Canvas context unavailable.'))
          return
        }

        // Fill white background for transparent PNGs converted to JPEG
        if (file.type !== 'image/png') {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, width, height)
        }

        ctx.drawImage(img, 0, 0, width, height)

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const dataUrl = canvas.toDataURL(mimeType, quality)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image.'))
              return
            }

            resolve({
              blob,
              dataUrl,
              fileName: file.name || `screenshot_${Date.now()}.${mimeType === 'image/png' ? 'png' : 'jpg'}`,
              fileSize: blob.size,
              originalSize: file.size,
              width,
              height,
              mimeType
            })
          },
          mimeType,
          quality
        )
      }

      img.src = e.target.result
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Uploads image to Supabase Storage bucket 'feedback-images' if available.
 * If storage bucket does not exist or fails, safely falls back to base64 dataUrl.
 */
export async function uploadFeedbackImage(processedImage, userId) {
  if (!processedImage) return null

  try {
    const fileExt = processedImage.mimeType === 'image/png' ? 'png' : 'jpg'
    const fileName = `feedback_${userId || 'anon'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('feedback-images')
      .upload(fileName, processedImage.blob, {
        contentType: processedImage.mimeType,
        upsert: false
      })

    if (!uploadError) {
      const { data: publicData } = supabase.storage
        .from('feedback-images')
        .getPublicUrl(fileName)

      if (publicData?.publicUrl) {
        return publicData.publicUrl
      }
    }
  } catch (err) {
    console.warn('Supabase storage upload skipped or failed, falling back to data URL:', err)
  }

  // Graceful fallback to dataUrl
  return processedImage.dataUrl
}

/**
 * Inserts feedback with image attachment into the database.
 * Resilient to missing 'image_url' column: automatically falls back to
 * embedding the attachment marker if the SQL migration has not been run yet.
 */
export async function submitFeedbackWithImage({
  userId,
  message,
  name,
  email,
  processedImage
}) {
  const cleanMessage = (message || '').trim()
  if (!cleanMessage && !processedImage) {
    throw new Error('Please enter a message or attach an image.')
  }

  let imageUrl = null
  if (processedImage) {
    imageUrl = await uploadFeedbackImage(processedImage, userId)
  }

  // First try inserting with image_url column
  const payloadWithCol = {
    user_id: userId || null,
    message: cleanMessage,
    status: 'pending'
  }
  if (name) payloadWithCol.name = name
  if (email) payloadWithCol.email = email
  if (imageUrl) payloadWithCol.image_url = imageUrl

  const { data, error } = await supabase.from('feedback').insert(payloadWithCol).select().single()

  // If column image_url doesn't exist yet (Postgres code 42703), retry by appending to message
  if (error && (error.code === '42703' || error.message?.includes('image_url'))) {
    console.warn('feedback.image_url column not found in database; using message attachment fallback.')
    const fallbackMessage = imageUrl
      ? `${cleanMessage}\n\n__ATTACHMENT__:${imageUrl}`
      : cleanMessage

    const payloadFallback = {
      user_id: userId || null,
      message: fallbackMessage,
      status: 'pending'
    }
    if (name) payloadFallback.name = name
    if (email) payloadFallback.email = email

    const { data: retryData, error: retryError } = await supabase
      .from('feedback')
      .insert(payloadFallback)
      .select()
      .single()

    if (retryError) throw retryError
    return { data: retryData, imageUrl }
  }

  if (error) throw error
  return { data, imageUrl }
}

/**
 * Parses feedback item and cleanly extracts message text and image URL,
 * whether stored in the image_url column or embedded in the message.
 */
export function parseFeedbackItem(item) {
  if (!item) return { cleanMessage: '', imageUrl: null }

  let cleanMessage = item.message || ''
  let imageUrl = item.image_url || null

  if (!imageUrl && cleanMessage.includes('__ATTACHMENT__:')) {
    const parts = cleanMessage.split('__ATTACHMENT__:')
    cleanMessage = parts[0].trim()
    imageUrl = parts[1]?.trim() || null
  }

  return {
    ...item,
    cleanMessage,
    imageUrl
  }
}

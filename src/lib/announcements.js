// Utilities for Announcement Metadata Serialization & Deserialization
// Ensures channels and targeting work seamlessly even if Supabase table columns are pending migration.

export const ANNOUNCEMENT_META_PREFIX = '<!--AXON_META:'
export const ANNOUNCEMENT_META_SUFFIX = '-->\n'

/**
 * Encodes metadata (channels, target_type, target_ids) into the message string
 * when database columns are not available.
 */
export function encodeAnnouncementMessage(rawMessage, metadata = {}) {
  const metaClean = {
    channels: metadata.channels || { in_app: true, push: false, email: false },
    target_type: metadata.target_type || 'all',
    target_ids: metadata.target_ids || []
  }
  const metaJson = JSON.stringify(metaClean)
  return `${ANNOUNCEMENT_META_PREFIX}${metaJson}${ANNOUNCEMENT_META_SUFFIX}${rawMessage.trim()}`
}

/**
 * Parses an announcement record from Supabase.
 * Extracts channels and audience targeting from either native columns or the encoded message prefix.
 */
export function parseAnnouncement(item) {
  if (!item || typeof item !== 'object') return item

  let message = item.message || ''
  let channels = item.channels || null
  let target_type = item.target_type || null
  let target_ids = item.target_ids || null
  let target_group = item.target_group || null

  // Check if message has encoded metadata prefix
  if (typeof message === 'string' && message.startsWith(ANNOUNCEMENT_META_PREFIX)) {
    const endIdx = message.indexOf(ANNOUNCEMENT_META_SUFFIX)
    if (endIdx !== -1) {
      try {
        const metaStr = message.substring(ANNOUNCEMENT_META_PREFIX.length, endIdx)
        const parsed = JSON.parse(metaStr)
        if (!channels && parsed.channels) channels = parsed.channels
        if (!target_type && parsed.target_type) target_type = parsed.target_type
        if (!target_ids && parsed.target_ids) target_ids = parsed.target_ids
        if (!target_group && parsed.target_group) target_group = parsed.target_group
        message = message.substring(endIdx + ANNOUNCEMENT_META_SUFFIX.length)
      } catch (e) {
        console.warn('Failed to parse announcement metadata prefix:', e)
      }
    }
  }

  // If still no channels specified, fallback to default in-app only for legacy announcements
  if (!channels) {
    channels = { in_app: true, push: false, email: false }
  } else {
    channels = {
      in_app: Boolean(channels.in_app),
      push: Boolean(channels.push),
      email: Boolean(channels.email)
    }
  }

  return {
    ...item,
    message,
    channels,
    target_type: target_type || 'all',
    target_ids: Array.isArray(target_ids) ? target_ids : [],
    target_group: target_group || null
  }
}

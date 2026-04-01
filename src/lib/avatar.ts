// Pure avatar utility functions — no React deps, fully testable

const AVATAR_COLORS = [
  '#0D9373', // emerald
  '#7C3AED', // violet
  '#D97706', // amber
  '#2563EB', // blue
  '#E11D48', // rose
  '#76766E', // slate
]

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

/** Returns the 1–2 character initials for an avatar. */
export function getInitials(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/** Returns a deterministic brand color for a name string. */
export function getAvatarColor(name: string | null | undefined): string {
  if (!name || name.length === 0) return AVATAR_COLORS[0]
  const code = (name.charCodeAt(0) ?? 0) + (name.charCodeAt(1) ?? 0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

export interface AvatarFileValidation {
  valid: boolean
  error?: string
}

/** Validates a file before upload. Pure function — no side effects. */
export function validateAvatarFile(file: { type: string; size: number }): AvatarFileValidation {
  if (file.size === 0) return { valid: false, error: 'empty file' }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'invalid type — jpeg, png or webp only' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'too large — max 2MB' }
  }
  return { valid: true }
}

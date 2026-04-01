// Pure validation helpers for message bodies.
// Used by the API route and testable without Supabase.

export const MESSAGE_MAX_LENGTH = 2000

export function validateMessageBody(body: unknown): string | null {
  if (typeof body !== 'string' || !body.trim()) return 'body required'
  if (body.trim().length > MESSAGE_MAX_LENGTH) return `Message too long (max ${MESSAGE_MAX_LENGTH} characters)`
  return null
}

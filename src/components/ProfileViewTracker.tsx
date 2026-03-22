'use client'

import { useEffect } from 'react'

interface Props {
  profileSlug: string
}

// Fires a view tracking beacon on mount. Renders nothing.
export default function ProfileViewTracker({ profileSlug }: Props) {
  useEffect(() => {
    fetch('/api/views/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_slug: profileSlug }),
    }).catch(() => {
      // Silently ignore — tracking is best-effort
    })
  }, [profileSlug])

  return null
}

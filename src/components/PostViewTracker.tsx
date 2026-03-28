'use client'

import { useEffect } from 'react'

interface Props {
  postId: string
}

// Fires a view tracking beacon on mount. Renders nothing.
export default function PostViewTracker({ postId }: Props) {
  useEffect(() => {
    fetch('/api/views/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId }),
    }).catch(() => {
      // Silently ignore — tracking is best-effort
    })
  }, [postId])

  return null
}

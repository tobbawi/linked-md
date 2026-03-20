import { createBrowserClient } from '@supabase/ssr'

// Browser client — uses createBrowserClient from @supabase/ssr so the session
// is synced to cookies, making it visible to server components and API routes.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

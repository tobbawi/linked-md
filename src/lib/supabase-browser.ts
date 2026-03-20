import { createClient } from '@supabase/supabase-js'

// Browser-only client — safe to import in 'use client' components
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

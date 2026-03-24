/**
 * Create the Supabase Storage bucket for avatars.
 *
 * Run once after deploying:
 *   npx tsx scripts/setup-storage.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * The service role key is needed to create buckets (anon key cannot).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually (dotenv is not a listed dep; keep scripts zero-dep)
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch { /* .env.local not present */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function main() {
  const BUCKET = 'avatars'

  // Check if bucket already exists
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === BUCKET)

  if (exists) {
    console.log(`Bucket "${BUCKET}" already exists — nothing to do.`)
    return
  }

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2MB (enforced at API layer too)
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  })

  if (error) {
    console.error('Failed to create bucket:', error.message)
    process.exit(1)
  }

  console.log(`Bucket "${BUCKET}" created successfully (public CDN, 2MB limit).`)
}

main()

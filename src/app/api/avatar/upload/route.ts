import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import { validateAvatarFile } from '@/lib/avatar'

// Plain service-role client — bypasses RLS for Storage operations.
// @supabase/ssr's createServerClient layers cookie auth on top of the key,
// which causes Storage RLS to reject uploads even with the service role key.
function createAdminStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: Request) {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate MIME type and size before any Storage write
  const validation = validateAvatarFile({ type: file.type, size: file.size })
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const supabase = createServerClient()
  const adminStorage = createAdminStorageClient()

  // Ensure the avatars bucket exists (idempotent — ignore "already exists" error)
  const { error: bucketError } = await adminStorage.storage.createBucket('avatars', {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  })
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('[avatar/upload] bucket create error:', bucketError)
  }

  // SECURITY: verify session user owns the profile before writing to Storage
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const profileId = profile.id
  const storagePath = `avatars/${profileId}`

  // Upload original — CSS object-fit: cover handles display cropping
  const uploadBytes = await file.arrayBuffer()
  const uploadMime = file.type

  // Delete old avatar before uploading new one (no orphan files)
  if (profile.avatar_url) {
    await adminStorage.storage.from('avatars').remove([storagePath])
  }

  // Upload to Supabase Storage
  const { error: uploadError } = await adminStorage.storage
    .from('avatars')
    .upload(storagePath, uploadBytes, {
      contentType: uploadMime,
      upsert: true,
    })

  if (uploadError) {
    console.error('[avatar/upload] storage error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Construct CDN URL
  const { data: { publicUrl } } = adminStorage.storage.from('avatars').getPublicUrl(storagePath)

  // Update profile — only if Storage write succeeded
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', profileId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ avatarUrl: publicUrl })
}

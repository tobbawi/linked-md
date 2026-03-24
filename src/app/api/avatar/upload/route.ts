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

  // Validate MIME type and size (client-provided type) before reading body
  const validation = validateAvatarFile({ type: file.type, size: file.size })
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // SECURITY: magic number check — verify actual file bytes match the declared MIME type
  const uploadBytes = await file.arrayBuffer()
  const header = new Uint8Array(uploadBytes.slice(0, 12))
  const isJpeg = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47
  const isWebp = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
                 header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
  if (!isJpeg && !isPng && !isWebp) {
    return NextResponse.json({ error: 'Invalid image file' }, { status: 400 })
  }
  const uploadMime = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/webp'

  const supabase = createServerClient()
  const adminStorage = createAdminStorageClient()

  // SECURITY: verify session user owns the profile before writing to Storage
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const profileId = profile.id
  const storagePath = `avatars/${profileId}`

  // Upload to Supabase Storage (upsert: true overwrites existing — no pre-delete needed)
  const { error: uploadError } = await adminStorage.storage
    .from('avatars')
    .upload(storagePath, uploadBytes, {
      contentType: uploadMime,
      upsert: true,
    })

  if (uploadError) {
    console.error('[avatar/upload] storage error:', uploadError)
    return NextResponse.json({ error: 'Upload failed — try again' }, { status: 500 })
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

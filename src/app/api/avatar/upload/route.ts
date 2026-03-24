import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import { validateAvatarFile } from '@/lib/avatar'

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

  // SECURITY: verify session user owns the profile before writing to Storage
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const profileId = profile.id
  const storagePath = `avatars/${profileId}`

  // Optionally resize with jimp — skip if unavailable or too slow
  let uploadBytes: ArrayBuffer
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Jimp } = require('jimp') as { Jimp: { read: (b: Buffer) => Promise<{ cover: (o: {w:number,h:number}) => void, getBuffer: (t: string) => Promise<ArrayBuffer> }> } }
    const buffer = Buffer.from(await file.arrayBuffer())
    const image = await Jimp.read(buffer)
    image.cover({ w: 400, h: 400 })
    uploadBytes = await image.getBuffer('image/jpeg')
  } catch {
    // jimp unavailable or resize failed — upload original as-is
    // CSS object-fit: cover handles display; this is storage-only optimization
    uploadBytes = await file.arrayBuffer()
  }

  // Delete old avatar before uploading new one (no orphan files)
  if (profile.avatar_url) {
    await supabase.storage.from('avatars').remove([storagePath])
  }

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(storagePath, uploadBytes, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed — try again' }, { status: 500 })
  }

  // Construct CDN URL at render time (store path only, not full URL)
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(storagePath)

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

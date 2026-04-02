'use client'

import { getInitials, getAvatarColor } from '@/lib/avatar'

interface AvatarProps {
  name: string | null | undefined
  avatarUrl?: string | null
  size?: number
  shape?: 'circle' | 'square' // square = companies (border-radius 6px)
  variant?: 'default' | 'nav'   // nav = emerald gradient background
}

/**
 * Avatar component — initials are always the base layer.
 * If avatarUrl is provided, the photo overlays the initials.
 * Never renders a broken img — photo load failure falls back to initials.
 *
 * shape='circle' (default) for people, shape='square' for companies.
 * variant='nav' applies the branded emerald gradient background.
 */
export default function Avatar({
  name,
  avatarUrl,
  size = 40,
  shape = 'circle',
  variant = 'default',
}: AvatarProps) {
  const initials = getInitials(name)
  const color = getAvatarColor(name)
  const borderRadius = shape === 'square' ? '6px' : '50%'
  const fontSize = size <= 28 ? '11px' : size <= 36 ? '13px' : size <= 44 ? '16px' : size <= 64 ? '22px' : '26px'

  const bgStyle =
    variant === 'nav'
      ? { background: 'linear-gradient(135deg, #0D9373, #0B7D62)', color: '#fff' }
      : { background: color + '22', color }

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center font-bold font-serif overflow-hidden"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius,
        fontSize,
        ...bgStyle,
      }}
    >
      {/* Initials base layer */}
      <span aria-hidden="true">{initials}</span>

      {/* Photo overlay — covers initials when loaded, hidden on error */}
      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name ?? ''}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ borderRadius }}
          onError={(e) => {
            // On broken image, hide the img so initials show through
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      )}
    </div>
  )
}

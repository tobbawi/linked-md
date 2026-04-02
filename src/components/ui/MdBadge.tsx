import Link from 'next/link'

interface MdBadgeProps {
  href: string
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function MdBadge({ href, label, size = 'sm', className = '' }: MdBadgeProps) {
  const sizeClass = size === 'md'
    ? 'text-[13px] px-2.5 py-1'
    : 'text-[11px] px-2 py-0.5'

  return (
    <Link
      href={href}
      className={`font-mono text-primary bg-primary-light rounded-sm inline-block whitespace-nowrap overflow-hidden text-ellipsis max-w-full align-middle ${sizeClass} ${className}`}
      aria-label="View markdown source"
    >
      {label || href}
    </Link>
  )
}

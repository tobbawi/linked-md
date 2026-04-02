import Link from 'next/link'

interface LlmBadgeProps {
  href: string
  className?: string
}

export function LlmBadge({ href, className = '' }: LlmBadgeProps) {
  return (
    <Link
      href={href}
      className={`font-mono text-[11px] text-primary bg-primary-light border border-primary rounded-sm px-2 py-0.5 inline-block whitespace-nowrap ${className}`}
    >
      llm.txt available
    </Link>
  )
}

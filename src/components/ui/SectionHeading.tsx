interface SectionHeadingProps {
  children: React.ReactNode
  className?: string
}

export function SectionHeading({ children, className = '' }: SectionHeadingProps) {
  return (
    <h2
      className={`text-[11px] font-semibold uppercase tracking-wider text-muted mb-sm ${className}`}
    >
      {children}
    </h2>
  )
}

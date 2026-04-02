interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={`bg-card border border-border rounded-md ${hover ? 'transition-colors hover:border-primary' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

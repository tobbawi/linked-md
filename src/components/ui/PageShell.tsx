interface PageShellProps {
  children: React.ReactNode
  className?: string
}

export function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <main className={`max-w-[960px] mx-auto px-md py-lg ${className}`}>
      {children}
    </main>
  )
}

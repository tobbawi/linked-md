import Link from 'next/link'

interface FilepathBarProps {
  path: string
  href: string
}

export function FilepathBar({ path, href }: FilepathBarProps) {
  return (
    <div className="bg-card border-b border-border px-md py-xs">
      <Link
        href={href}
        className="font-mono text-[12px] text-muted hover:text-primary transition-colors truncate block"
        aria-label={`View raw markdown at ${path}`}
      >
        {path}
      </Link>
    </div>
  )
}

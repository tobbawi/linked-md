import Link from 'next/link'

export default function HomePage() {
  return (
    <div
      style={{
        paddingTop: 'var(--space-3xl)',
        paddingBottom: 'var(--space-3xl)',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '2.625rem',
          color: 'var(--color-ink)',
          lineHeight: 1.2,
          marginBottom: 'var(--space-md)',
        }}
      >
        Your profile is a markdown file.
      </h1>
      <p
        style={{
          fontSize: '1.125rem',
          color: 'var(--color-secondary)',
          maxWidth: '480px',
          margin: '0 auto var(--space-xl)',
          lineHeight: 1.6,
        }}
      >
        An open professional network where every profile, post, and company is a{' '}
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
          .md
        </span>{' '}
        file. Open. Portable. AI-readable.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/auth"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: '15px',
            transition: 'background 150ms ease',
          }}
        >
          Get started
        </Link>
        <Link
          href="/auth?tab=login"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: 'none',
            color: 'var(--color-secondary)',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
            fontSize: '15px',
            border: '1px solid var(--color-border)',
          }}
        >
          Sign in
        </Link>
      </div>

      <div
        style={{
          marginTop: 'var(--space-3xl)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          color: 'var(--color-muted)',
          fontSize: '13px',
        }}
      >
        <span>Your profile lives at</span>
        <span className="md-url">/profile/your-name.md</span>
      </div>
    </div>
  )
}

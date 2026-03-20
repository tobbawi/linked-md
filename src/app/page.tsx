export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Nav */}
      <nav
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
        className="sticky top-0 z-10"
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontSize: 15, fontWeight: 600 }}>
            linked.md
          </span>
          <a
            href="/auth"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Create your profile
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            color: 'var(--color-ink)',
            lineHeight: 1.15,
            marginBottom: 16,
          }}
        >
          Your professional identity,<br />in markdown.
        </h1>
        <p
          style={{
            fontSize: 18,
            color: 'var(--color-secondary)',
            marginBottom: 32,
            maxWidth: 480,
          }}
        >
          Open. Portable. AI-readable.
        </p>
        <div className="flex gap-3 flex-wrap">
          <a
            href="/auth"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: 15,
            }}
          >
            Create your profile.md
          </a>
          <a
            href="/profile/wim.md"
            className="md-url"
            style={{ padding: '10px 16px', fontSize: 13 }}
          >
            /profile/wim.md
          </a>
        </div>
      </section>

      {/* Three differentiators */}
      <section
        style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
        className="max-w-5xl mx-auto px-6 py-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="md-url" style={{ marginBottom: 12 }}>profile/you.md</div>
            <h3 style={{ color: 'var(--color-ink)', fontWeight: 600, marginBottom: 8 }}>
              Your data is a .md file
            </h3>
            <p style={{ color: 'var(--color-secondary)', fontSize: 14, lineHeight: 1.6 }}>
              Every profile, post, and company has a canonical markdown URL. Human-readable, version-controllable, yours forever.
            </p>
          </div>
          <div>
            <div className="llm-badge" style={{ marginBottom: 12 }}>llm.txt available</div>
            <h3 style={{ color: 'var(--color-ink)', fontWeight: 600, marginBottom: 8 }}>
              AI can read your profile
            </h3>
            <p style={{ color: 'var(--color-secondary)', fontSize: 14, lineHeight: 1.6 }}>
              Every profile auto-generates llm.txt and llm-full.txt — optimized for LLMs to consume, summarize, and reason about your career graph.
            </p>
          </div>
          <div>
            <div className="md-url" style={{ marginBottom: 12 }}>graph.json</div>
            <h3 style={{ color: 'var(--color-ink)', fontWeight: 600, marginBottom: 8 }}>
              Your graph connects to everyone
            </h3>
            <p style={{ color: 'var(--color-secondary)', fontSize: 14, lineHeight: 1.6 }}>
              {"[[Wikilinks]]"} in any post or bio create bidirectional connections. Your professional graph is public, traversable, and machine-readable by design.
            </p>
          </div>
        </div>
      </section>

      <footer style={{ color: 'var(--color-muted)', fontSize: 13 }} className="max-w-5xl mx-auto px-6 py-8">
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>linked.md</span>
        {' '}— open professional network. Every profile is a markdown file.
      </footer>
    </main>
  )
}

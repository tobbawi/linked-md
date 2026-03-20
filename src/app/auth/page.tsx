'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Tab = 'signup' | 'login'

export default function AuthPage() {
  const searchParams = useSearchParams()
  const initialTab: Tab = searchParams.get('tab') === 'login' ? 'login' : 'signup'

  const [tab, setTab] = useState<Tab>(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleTabChange(newTab: Tab) {
    setTab(newTab)
    setError(null)
    setSuccess(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      if (tab === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) {
          setError(signUpError.message)
        } else {
          setSuccess('Check your email to confirm your account.')
          setEmail('')
          setPassword('')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) {
          setError(signInError.message)
        } else {
          router.push('/')
          router.refresh()
        }
      }
    })
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--color-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            linked.md
          </span>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 0,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px',
            marginBottom: 'var(--space-lg)',
          }}
        >
          {(['signup', 'login'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => handleTabChange(t)}
              style={{
                flex: 1,
                padding: '7px 0',
                fontSize: '13px',
                fontWeight: tab === t ? 600 : 400,
                fontFamily: 'var(--font-sans)',
                color: tab === t ? 'var(--color-ink)' : 'var(--color-secondary)',
                background: tab === t ? 'var(--color-card)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'background 150ms ease, color 150ms ease',
              }}
            >
              {t === 'signup' ? 'Sign up' : 'Log in'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-text)',
                marginBottom: 'var(--space-xs)',
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '15px',
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-text)',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                transition: 'border-color 150ms ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-text)',
                marginBottom: 'var(--space-xs)',
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '15px',
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-text)',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                transition: 'border-color 150ms ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              style={{
                marginBottom: 'var(--space-md)',
                padding: '10px 12px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                color: 'var(--color-error)',
              }}
            >
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div
              role="status"
              style={{
                marginBottom: 'var(--space-md)',
                padding: '10px 12px',
                background: 'var(--color-primary-light)',
                border: '1px solid var(--color-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                color: 'var(--color-primary)',
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              width: '100%',
              padding: '10px',
              background: isPending ? 'var(--color-muted)' : 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: isPending ? 'not-allowed' : 'pointer',
              transition: 'background 150ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            {isPending ? (
              <>
                <Spinner />
                {tab === 'signup' ? 'Creating account…' : 'Signing in…'}
              </>
            ) : tab === 'signup' ? (
              'Sign up'
            ) : (
              'Log in'
            )}
          </button>
        </form>

        {/* Switch tab link */}
        <p
          style={{
            marginTop: 'var(--space-lg)',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--color-secondary)',
          }}
        >
          {tab === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => handleTabChange(tab === 'signup' ? 'login' : 'signup')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
              fontWeight: 500,
            }}
          >
            {tab === 'signup' ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
      <path
        d="M8 2 A6 6 0 0 1 14 8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

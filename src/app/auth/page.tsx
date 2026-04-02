'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

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
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-md">
      <div className="w-full max-w-[400px] bg-card border border-border rounded-lg p-xl">
        {/* Logo */}
        <div className="text-center mb-xl">
          <span className="font-mono text-[20px] font-semibold text-primary tracking-[-0.01em]">
            linked.md
          </span>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          className="flex gap-0 bg-bg border border-border rounded-sm p-[3px] mb-lg"
        >
          {(['signup', 'login'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => handleTabChange(t)}
              className="flex-1 py-[7px] text-[13px] font-sans border-none rounded-sm cursor-pointer transition-colors duration-150"
              style={{
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--color-ink)' : 'var(--color-secondary)',
                background: tab === t ? 'var(--color-card)' : 'transparent',
              }}
            >
              {t === 'signup' ? 'Sign up' : 'Log in'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-md">
            <label
              htmlFor="email"
              className="block text-[13px] font-medium text-text mb-xs"
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
              className="w-full py-[9px] px-[12px] text-[15px] font-sans text-text bg-bg border border-border rounded-sm outline-none transition-colors duration-150"
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <div className="mb-lg">
            <label
              htmlFor="password"
              className="block text-[13px] font-medium text-text mb-xs"
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
              className="w-full py-[9px] px-[12px] text-[15px] font-sans text-text bg-bg border border-border rounded-sm outline-none transition-colors duration-150"
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="mb-md py-[10px] px-[12px] bg-[#FEF2F2] border border-[#FECACA] rounded-sm text-[13px] text-error"
            >
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div
              role="status"
              className="mb-md py-[10px] px-[12px] bg-primary-light border border-primary rounded-sm text-[13px] text-primary"
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-[10px] text-white border-none rounded-sm text-[15px] font-semibold font-sans flex items-center justify-center gap-sm transition-colors duration-150"
            style={{
              background: isPending ? 'var(--color-muted)' : 'var(--color-primary)',
              cursor: isPending ? 'not-allowed' : 'pointer',
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
        <p className="mt-lg text-center text-[13px] text-secondary">
          {tab === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => handleTabChange(tab === 'signup' ? 'login' : 'signup')}
            className="bg-transparent border-none text-primary font-sans text-[13px] cursor-pointer p-0 font-medium"
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

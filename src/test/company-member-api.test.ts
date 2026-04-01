/**
 * Tests for POST/DELETE /api/company/member
 *
 * Strategy: mock Supabase clients, test route handler logic directly.
 * Covers the security-sensitive paths: auth, last-admin guard, owner guard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase mock helpers ─────────────────────────────────────────────────────

/** Build a chainable Supabase query that resolves with the given value.
 *  The chain itself is thenable so `await supabase.from(...).select(...).eq(...)` works
 *  even when the caller doesn't end with `.single()` / `.maybeSingle()` (e.g. count queries).
 */
function mockChain(resolved: { data?: unknown; count?: number; error?: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {
    // Make the chain itself thenable — handles queries that end with .eq() directly
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(resolved).then(onFulfilled, onRejected),
  }
  ;['select', 'eq', 'neq', 'order', 'limit'].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  ;['single', 'maybeSingle'].forEach(m => {
    chain[m] = vi.fn().mockResolvedValue(resolved)
  })
  chain['insert'] = vi.fn().mockReturnValue(chain)
  chain['delete'] = vi.fn().mockReturnValue(chain)
  return chain
}

const mockGetUser = vi.fn()
const mockAuthFrom = vi.fn()
const mockServiceFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createAuthServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockAuthFrom,
  })),
  createServerClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}))

// ── Request factory ───────────────────────────────────────────────────────────

function makeRequest(method: 'POST' | 'DELETE', body: object): NextRequest {
  return new NextRequest(`http://localhost/api/company/member`, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Shared param validation ───────────────────────────────────────────────────

describe('POST /api/company/member — param validation', () => {
  it('returns 400 when company_slug is missing', async () => {
    const { POST } = await import('@/app/api/company/member/route')
    const req = makeRequest('POST', { profile_slug: 'alice' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/required/)
  })

  it('returns 400 when profile_slug is missing', async () => {
    const { POST } = await import('@/app/api/company/member/route')
    const req = makeRequest('POST', { company_slug: 'acme' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('strips leading @ from profile_slug before processing', async () => {
    // Expect a 401 (not logged in) — we just want to confirm it doesn't 400
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('@/app/api/company/member/route')
    const req = makeRequest('POST', { company_slug: 'acme', profile_slug: '@alice' })
    const res = await POST(req)
    // 401 because no user — but NOT 400 (params were parsed correctly)
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/company/member — param validation', () => {
  it('returns 400 when company_slug is missing', async () => {
    const { DELETE } = await import('@/app/api/company/member/route')
    const req = makeRequest('DELETE', { profile_slug: 'alice' })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })
})

// ── Auth guard (resolveIds) ───────────────────────────────────────────────────

describe('POST /api/company/member — auth guard', () => {
  it('returns 401 when user is not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('@/app/api/company/member/route')
    const req = makeRequest('POST', { company_slug: 'acme', profile_slug: 'alice' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not an admin of the company', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    // profiles query → returns profile
    mockServiceFrom.mockReturnValueOnce(mockChain({ data: { id: 'profile-1' } }))
    // companies query → returns company
    mockServiceFrom.mockReturnValueOnce(mockChain({ data: { id: 'co-1', user_id: 'owner-user' } }))
    // company_members membership check → caller is NOT an admin
    mockServiceFrom.mockReturnValueOnce(mockChain({ data: null }))

    const { POST } = await import('@/app/api/company/member/route')
    const req = makeRequest('POST', { company_slug: 'acme', profile_slug: 'alice' })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})

// ── POST happy path + conflicts ───────────────────────────────────────────────

describe('POST /api/company/member — business logic', () => {
  it('returns 404 when target profile does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockServiceFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-1' } }))   // my profile
      .mockReturnValueOnce(mockChain({ data: { id: 'co-1', user_id: 'user-1' } })) // company
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))      // membership (caller is admin)
      .mockReturnValueOnce(mockChain({ data: null }))                   // target profile → not found

    const { POST } = await import('@/app/api/company/member/route')
    const req = makeRequest('POST', { company_slug: 'acme', profile_slug: 'bob' })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 409 when target is already an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockServiceFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-1' } }))   // my profile
      .mockReturnValueOnce(mockChain({ data: { id: 'co-1', user_id: 'user-1' } })) // company
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))      // membership (caller is admin)
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-2' } }))   // target profile found
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))      // existing admin check → already admin

    const { POST } = await import('@/app/api/company/member/route')
    const req = makeRequest('POST', { company_slug: 'acme', profile_slug: 'bob' })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})

// ── DELETE guards ─────────────────────────────────────────────────────────────

describe('DELETE /api/company/member — last-admin guard', () => {
  it('returns 400 when removing the last admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockServiceFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-1' } }))          // my profile
      .mockReturnValueOnce(mockChain({ data: { id: 'co-1', user_id: 'user-1' } })) // company
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))             // membership (caller is admin)
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-2', user_id: 'other-user' } })) // target profile
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))             // target membership (is a member)
      .mockReturnValueOnce(mockChain({ count: 1 }))                            // admin count = 1 → last admin

    const { DELETE } = await import('@/app/api/company/member/route')
    const req = makeRequest('DELETE', { company_slug: 'acme', profile_slug: 'bob' })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/last admin/)
  })
})

describe('DELETE /api/company/member — owner guard', () => {
  it('returns 400 when removing the original company creator', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockServiceFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-1' } }))          // my profile
      .mockReturnValueOnce(mockChain({ data: { id: 'co-1', user_id: 'owner-user' } })) // company (owner-user is creator)
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))             // membership (caller is admin)
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-owner', user_id: 'owner-user' } })) // target = owner
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))             // target membership (is a member)
      .mockReturnValueOnce(mockChain({ count: 3 }))                            // admin count = 3 → NOT last admin

    const { DELETE } = await import('@/app/api/company/member/route')
    const req = makeRequest('DELETE', { company_slug: 'acme', profile_slug: 'owner' })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/owner/)
  })
})

// ── POST happy path ───────────────────────────────────────────────────────────

describe('POST /api/company/member — happy path', () => {
  it('returns 200 with member data when admin successfully adds a new admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const newMember = { company_id: 'co-1', profile_id: 'profile-2', role: 'admin' }
    mockServiceFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-1' } }))          // my profile
      .mockReturnValueOnce(mockChain({ data: { id: 'co-1', user_id: 'user-1' } })) // company
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))             // membership (caller is admin)
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-2' } }))           // target profile found
      .mockReturnValueOnce(mockChain({ data: null }))                          // not already admin
      .mockReturnValueOnce(mockChain({ data: newMember, error: null }))        // insert succeeds

    const { POST } = await import('@/app/api/company/member/route')
    const req = makeRequest('POST', { company_slug: 'acme', profile_slug: 'bob' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.member).toMatchObject({ company_id: 'co-1', profile_id: 'profile-2', role: 'admin' })
  })
})

// ── DELETE happy path + error paths ──────────────────────────────────────────

describe('DELETE /api/company/member — happy path', () => {
  it('returns 200 with removed:true when admin is successfully removed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockServiceFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-1' } }))          // my profile
      .mockReturnValueOnce(mockChain({ data: { id: 'co-1', user_id: 'owner-user' } })) // company
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))             // membership (caller is admin)
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-2', user_id: 'other-user' } })) // target profile (not owner)
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))             // target membership (is a member)
      .mockReturnValueOnce(mockChain({ count: 2 }))                            // admin count = 2 → NOT last admin
      .mockReturnValueOnce(mockChain({ error: null }))                         // delete succeeds

    const { DELETE } = await import('@/app/api/company/member/route')
    const req = makeRequest('DELETE', { company_slug: 'acme', profile_slug: 'bob' })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.removed).toBe(true)
  })

  it('returns 404 when target profile does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockServiceFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-1' } }))          // my profile
      .mockReturnValueOnce(mockChain({ data: { id: 'co-1', user_id: 'owner-user' } })) // company
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))             // membership (caller is admin)
      .mockReturnValueOnce(mockChain({ data: null }))                          // target profile not found

    const { DELETE } = await import('@/app/api/company/member/route')
    const req = makeRequest('DELETE', { company_slug: 'acme', profile_slug: 'ghost' })
    const res = await DELETE(req)
    expect(res.status).toBe(404)
  })

  it('returns 404 when target profile exists but is not a member', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockServiceFrom
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-1' } }))          // my profile
      .mockReturnValueOnce(mockChain({ data: { id: 'co-1', user_id: 'owner-user' } })) // company
      .mockReturnValueOnce(mockChain({ data: { role: 'admin' } }))             // membership (caller is admin)
      .mockReturnValueOnce(mockChain({ data: { id: 'profile-2', user_id: 'other-user' } })) // target profile found
      .mockReturnValueOnce(mockChain({ data: null }))                          // target membership → not a member

    const { DELETE } = await import('@/app/api/company/member/route')
    const req = makeRequest('DELETE', { company_slug: 'acme', profile_slug: 'non-member' })
    const res = await DELETE(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toMatch(/not an admin/)
  })
})

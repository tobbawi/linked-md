'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface GraphNode {
  slug: string
  display_name?: string
  resolved?: boolean
  x: number
  y: number
  kind: 'center' | 'outbound' | 'inbound'
}

interface GraphData {
  profile: { slug: string; display_name: string }
  outbound: { slug: string; resolved: boolean }[]
  inbound: { slug: string; display_name: string }[]
  post_count: number
}

function layoutNodes(data: GraphData): GraphNode[] {
  const nodes: GraphNode[] = []
  const cx = 400
  const cy = 260

  nodes.push({ slug: data.profile.slug, display_name: data.profile.display_name, x: cx, y: cy, kind: 'center' })

  const outbound = data.outbound.filter((n) => n.resolved)
  const unresolved = data.outbound.filter((n) => !n.resolved)
  const inbound = data.inbound

  const total = outbound.length + inbound.length
  const r = total <= 4 ? 150 : total <= 8 ? 170 : 190

  let i = 0

  for (const node of outbound) {
    const angle = (2 * Math.PI * i) / Math.max(1, total)
    nodes.push({
      slug: node.slug,
      display_name: node.slug,
      resolved: true,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      kind: 'outbound',
    })
    i++
  }

  for (const node of inbound) {
    const angle = (2 * Math.PI * i) / Math.max(1, total)
    nodes.push({
      slug: node.slug,
      display_name: node.display_name,
      resolved: true,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      kind: 'inbound',
    })
    i++
  }

  for (const node of unresolved) {
    const angle = (2 * Math.PI * i) / Math.max(1, Math.max(total, unresolved.length + total))
    const rUnres = r + 60
    nodes.push({
      slug: node.slug,
      display_name: node.slug,
      resolved: false,
      x: cx + rUnres * Math.cos(angle),
      y: cy + rUnres * Math.sin(angle),
      kind: 'outbound',
    })
    i++
  }

  return nodes
}

export function GraphCanvas({ slug, displayName }: { slug: string; displayName: string }) {
  const [data, setData] = useState<GraphData | null>(null)
  const [error, setError] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/graph/${slug}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true))
  }, [slug])

  if (error) {
    return <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Failed to load graph.</p>
  }

  if (!data) {
    return <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading graph…</p>
  }

  const nodes = layoutNodes(data)
  const center = nodes[0]
  const cx = 400
  const cy = 260

  const resolvedOutbound = data.outbound.filter((n) => n.resolved).map((n) => n.slug)
  const unresolvedOutbound = data.outbound.filter((n) => !n.resolved).map((n) => n.slug)
  const inboundSlugs = data.inbound.map((n) => n.slug)

  return (
    <div>
      <svg
        viewBox="0 0 800 520"
        style={{
          width: '100%',
          maxWidth: '800px',
          display: 'block',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {/* Edges */}
        {nodes.slice(1).map((node) => (
          <line
            key={`edge-${node.slug}`}
            x1={cx}
            y1={cy}
            x2={node.x}
            y2={node.y}
            stroke={node.resolved === false ? 'var(--color-border)' : 'var(--color-primary)'}
            strokeWidth={hovered === node.slug ? 2 : 1}
            strokeOpacity={node.resolved === false ? 0.4 : 0.5}
            strokeDasharray={node.kind === 'inbound' ? '4 3' : undefined}
          />
        ))}

        {/* Center node */}
        <circle cx={cx} cy={cy} r={22} fill="var(--color-primary)" />
        <text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="13"
          fontWeight="700"
          fontFamily="var(--font-serif)"
        >
          {displayName.charAt(0).toUpperCase()}
        </text>
        <text
          x={cx}
          y={cy + 34}
          textAnchor="middle"
          fill="var(--color-ink)"
          fontSize="11"
          fontWeight="600"
          fontFamily="var(--font-sans)"
        >
          {displayName.length > 16 ? displayName.slice(0, 15) + '…' : displayName}
        </text>

        {/* Satellite nodes */}
        {nodes.slice(1).map((node) => {
          const isResolved = node.resolved !== false
          const r = 14
          return (
            <g
              key={node.slug}
              onMouseEnter={() => setHovered(node.slug)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: isResolved ? 'pointer' : 'default' }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={
                  node.kind === 'inbound'
                    ? 'var(--color-primary-light)'
                    : isResolved
                    ? 'var(--color-card)'
                    : 'var(--color-bg)'
                }
                stroke={isResolved ? 'var(--color-primary)' : 'var(--color-border)'}
                strokeWidth={hovered === node.slug ? 2 : 1}
              />
              {isResolved && (
                <text
                  x={node.x}
                  y={node.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--color-primary)"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="var(--font-sans)"
                >
                  {(node.display_name ?? node.slug).charAt(0).toUpperCase()}
                </text>
              )}
              <text
                x={node.x}
                y={node.y + r + 12}
                textAnchor="middle"
                fill={isResolved ? 'var(--color-text)' : 'var(--color-muted)'}
                fontSize="10"
                fontFamily="var(--font-sans)"
              >
                {(node.display_name ?? node.slug).length > 14
                  ? (node.display_name ?? node.slug).slice(0, 13) + '…'
                  : (node.display_name ?? node.slug)}
              </text>
              {isResolved && (
                <a href={`/profile/${node.slug}`}>
                  <rect
                    x={node.x - r}
                    y={node.y - r}
                    width={r * 2}
                    height={r * 2}
                    fill="transparent"
                  />
                </a>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div
        style={{
          marginTop: 'var(--space-md)',
          display: 'flex',
          gap: 'var(--space-lg)',
          flexWrap: 'wrap',
          fontSize: '12px',
          color: 'var(--color-muted)',
        }}
      >
        <span>
          <svg width="20" height="10" style={{ verticalAlign: 'middle', marginRight: 4 }}>
            <line x1="0" y1="5" x2="20" y2="5" stroke="var(--color-primary)" strokeWidth="1.5" />
          </svg>
          outbound links ({resolvedOutbound.length} resolved)
        </span>
        <span>
          <svg width="20" height="10" style={{ verticalAlign: 'middle', marginRight: 4 }}>
            <line x1="0" y1="5" x2="20" y2="5" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          inbound links ({inboundSlugs.length})
        </span>
        {unresolvedOutbound.length > 0 && (
          <span>
            <svg width="20" height="10" style={{ verticalAlign: 'middle', marginRight: 4 }}>
              <line x1="0" y1="5" x2="20" y2="5" stroke="var(--color-border)" strokeWidth="1.5" />
            </svg>
            unresolved ({unresolvedOutbound.length})
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: 'var(--space-sm)',
          fontSize: '12px',
          color: 'var(--color-muted)',
        }}
      >
        {data.post_count} post{data.post_count !== 1 ? 's' : ''} ·{' '}
        <Link href={`/profile/${slug}/graph.json`} style={{ color: 'var(--color-primary)' }}>
          graph.json
        </Link>
      </div>
    </div>
  )
}

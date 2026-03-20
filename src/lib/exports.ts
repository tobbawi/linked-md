/**
 * File export system — two tiers:
 *
 * Content writes (profile edit, new post):
 *   → immediate synchronous export of .md, llm.txt, llm-full.txt, graph.json
 *
 * Social interactions (likes, follows, comments) — M2:
 *   → queued for batch re-export every 60 seconds
 *
 * M1: writes to local filesystem under /exports/
 * M2: migrate to Cloudflare R2 (see TODOS.md)
 *
 * Failure model:
 *   - If DB write fails → file export does not run
 *   - If file export fails → DB write is NOT rolled back; retry async (max 3, exp backoff)
 */

import fs from 'fs/promises'
import path from 'path'
import type { Profile, Post } from '@/types'

const EXPORTS_DIR = path.join(process.cwd(), 'exports')

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

export async function exportProfileMarkdown(profile: Profile): Promise<void> {
  const dir = path.join(EXPORTS_DIR, 'profile')
  await ensureDir(dir)
  await fs.writeFile(
    path.join(dir, `${profile.slug}.md`),
    profile.markdown_content,
    'utf-8'
  )
}

export async function exportLlmTxt(profile: Profile, posts: Post[]): Promise<string> {
  /**
   * llm.txt format — compact, designed to fit in an LLM context window
   * alongside other profiles. See design doc sample format.
   */
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'
  const recentPosts = posts.slice(0, 10)

  const lines: string[] = [
    `# linked.md profile: ${profile.display_name}`,
    `> ${baseUrl}/profile/${profile.slug}.md`,
    '',
    '## Summary',
    profile.bio || '(no bio)',
    '',
  ]

  if (recentPosts.length > 0) {
    lines.push('## Recent posts')
    for (const post of recentPosts) {
      lines.push(
        `- [${post.title || post.slug}](${baseUrl}/profile/${profile.slug}/post/${post.slug}.md) — ${post.created_at.slice(0, 10)}`
      )
    }
    lines.push('')
  }

  if (profile.outbound_links.length > 0) {
    lines.push('## Linked entities')
    lines.push(profile.outbound_links.map(l => `- [[${l}]]`).join('\n'))
    lines.push('')
  }

  lines.push(`> Full profile: ${baseUrl}/profile/${profile.slug}/llm-full.txt`)
  lines.push(`> Graph: ${baseUrl}/profile/${profile.slug}/graph.json`)

  const content = lines.join('\n')

  const dir = path.join(EXPORTS_DIR, 'profile', profile.slug)
  await ensureDir(dir)
  await fs.writeFile(path.join(dir, 'llm.txt'), content, 'utf-8')

  return content
}

export async function exportLlmFullTxt(profile: Profile, posts: Post[]): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'

  const sections: string[] = [
    `# linked.md full profile: ${profile.display_name}`,
    `> ${baseUrl}/profile/${profile.slug}.md`,
    '',
    '## Profile',
    profile.markdown_content,
    '',
  ]

  if (posts.length > 0) {
    sections.push('## Posts')
    for (const post of posts) {
      sections.push(`### ${post.title || post.slug}`)
      sections.push(`> ${baseUrl}/profile/${profile.slug}/post/${post.slug}.md`)
      sections.push(post.markdown_content)
      sections.push('')
    }
  }

  const content = sections.join('\n')
  const dir = path.join(EXPORTS_DIR, 'profile', profile.slug)
  await ensureDir(dir)
  await fs.writeFile(path.join(dir, 'llm-full.txt'), content, 'utf-8')
}

export async function exportGraphJson(
  profile: Profile,
  inboundLinks: string[]
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'

  const graph = {
    entity: profile.display_name,
    url: `${baseUrl}/profile/${profile.slug}.md`,
    outbound: profile.outbound_links,
    inbound: inboundLinks,
  }

  const dir = path.join(EXPORTS_DIR, 'profile', profile.slug)
  await ensureDir(dir)
  await fs.writeFile(path.join(dir, 'graph.json'), JSON.stringify(graph, null, 2), 'utf-8')
}

export async function exportPostMarkdown(profile: Profile, post: Post): Promise<void> {
  const dir = path.join(EXPORTS_DIR, 'profile', profile.slug, 'post')
  await ensureDir(dir)
  await fs.writeFile(
    path.join(dir, `${post.slug}.md`),
    post.markdown_content,
    'utf-8'
  )
}

/**
 * Full profile export — called on every content write.
 * Exports .md, llm.txt, llm-full.txt, graph.json atomically.
 */
export async function exportAllProfileFiles(
  profile: Profile,
  posts: Post[],
  inboundLinks: string[]
): Promise<void> {
  await Promise.all([
    exportProfileMarkdown(profile),
    exportLlmTxt(profile, posts),
    exportLlmFullTxt(profile, posts),
    exportGraphJson(profile, inboundLinks),
  ])
}

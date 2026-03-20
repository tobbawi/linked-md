import fs from 'fs'
import path from 'path'
import type { Profile, Post } from '@/types'

const EXPORT_ROOT = path.join(process.cwd(), 'exports')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function buildProfileMarkdown(profile: Profile): string {
  const lines: string[] = []
  lines.push(`# ${profile.display_name}`)
  lines.push('')
  if (profile.bio) {
    lines.push(profile.bio)
    lines.push('')
  }
  if (profile.content) {
    lines.push(profile.content)
    lines.push('')
  }
  return lines.join('\n')
}

export function buildPostMarkdown(post: Post, authorSlug: string): string {
  const lines: string[] = []
  if (post.title) {
    lines.push(`# ${post.title}`)
    lines.push('')
  }
  lines.push(post.content)
  lines.push('')
  lines.push(`---`)
  lines.push(`author: ${authorSlug}`)
  lines.push(`created: ${post.created_at}`)
  return lines.join('\n')
}

export function buildLlmTxt(profile: Profile, posts: Post[]): string {
  const lines: string[] = []
  lines.push(`# ${profile.display_name} — linked.md profile`)
  lines.push('')
  if (profile.bio) {
    lines.push(`## Bio`)
    lines.push(profile.bio)
    lines.push('')
  }
  if (posts.length > 0) {
    lines.push(`## Posts`)
    for (const post of posts) {
      if (post.title) lines.push(`### ${post.title}`)
      lines.push(post.content)
      lines.push('')
    }
  }
  return lines.join('\n')
}

export function exportProfileMarkdown(profile: Profile): void {
  const dir = path.join(EXPORT_ROOT, 'profile', profile.slug)
  ensureDir(dir)
  const md = buildProfileMarkdown(profile)
  fs.writeFileSync(path.join(dir, 'index.md'), md, 'utf-8')
}

export function exportPostMarkdown(post: Post, authorSlug: string): void {
  const dir = path.join(EXPORT_ROOT, 'profile', authorSlug, 'post')
  ensureDir(dir)
  const md = buildPostMarkdown(post, authorSlug)
  fs.writeFileSync(path.join(dir, `${post.slug}.md`), md, 'utf-8')
}

export function exportLlmTxt(profile: Profile, posts: Post[]): void {
  const dir = path.join(EXPORT_ROOT, 'profile', profile.slug)
  ensureDir(dir)
  const txt = buildLlmTxt(profile, posts)
  fs.writeFileSync(path.join(dir, 'llm.txt'), txt, 'utf-8')
}

export async function exportAllProfileFiles(
  profile: Profile,
  posts: Post[]
): Promise<void> {
  exportProfileMarkdown(profile)
  exportLlmTxt(profile, posts)
  for (const post of posts) {
    exportPostMarkdown(post, profile.slug)
  }
}

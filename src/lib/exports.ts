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
  const meta: string[] = []
  if (profile.title) meta.push(profile.title)
  if (profile.location) meta.push(profile.location)
  if (profile.website) meta.push(profile.website)
  if (meta.length) {
    lines.push(meta.join(' · '))
    lines.push('')
  }
  if (profile.bio) {
    lines.push(profile.bio)
    lines.push('')
  }
  if (profile.markdown_content) {
    lines.push(profile.markdown_content)
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
  lines.push(post.markdown_content)
  lines.push('')
  lines.push(`---`)
  lines.push(`author: ${authorSlug}`)
  lines.push(`created: ${post.created_at}`)
  return lines.join('\n')
}

interface PostWithStats extends Post {
  likeCount?: number
  commentCount?: number
}

interface ProfileStats {
  followerCount?: number
  followingCount?: number
}

export function buildLlmTxt(
  profile: Profile,
  posts: Post[],
  stats?: ProfileStats
): string {
  const lines: string[] = []
  lines.push(`# ${profile.display_name} — linked.md profile`)
  lines.push('')
  if (profile.title || profile.location || profile.website) {
    if (profile.title) lines.push(`title: ${profile.title}`)
    if (profile.location) lines.push(`location: ${profile.location}`)
    if (profile.website) lines.push(`website: ${profile.website}`)
    lines.push('')
  }
  if (profile.bio) {
    lines.push(`## Bio`)
    lines.push(profile.bio)
    lines.push('')
  }
  if (stats?.followerCount !== undefined || stats?.followingCount !== undefined) {
    lines.push(`## Network`)
    if (stats.followerCount !== undefined) lines.push(`followers: ${stats.followerCount}`)
    if (stats.followingCount !== undefined) lines.push(`following: ${stats.followingCount}`)
    lines.push('')
  }
  if (posts.length > 0) {
    lines.push(`## Posts`)
    for (const post of posts as PostWithStats[]) {
      if (post.title) lines.push(`### ${post.title}`)
      lines.push(post.markdown_content)
      const meta: string[] = []
      if (post.likeCount) meta.push(`${post.likeCount} likes`)
      if (post.commentCount) meta.push(`${post.commentCount} comments`)
      if (meta.length) lines.push(`_${meta.join(' · ')}_`)
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

export function exportLlmTxt(
  profile: Profile,
  posts: Post[],
  stats?: { followerCount?: number; followingCount?: number }
): void {
  const dir = path.join(EXPORT_ROOT, 'profile', profile.slug)
  ensureDir(dir)
  const txt = buildLlmTxt(profile, posts, stats)
  fs.writeFileSync(path.join(dir, 'llm.txt'), txt, 'utf-8')
}

export async function exportAllProfileFiles(
  profile: Profile,
  posts: Post[],
  stats?: { followerCount?: number; followingCount?: number }
): Promise<void> {
  exportProfileMarkdown(profile)
  exportLlmTxt(profile, posts, stats)
  for (const post of posts) {
    exportPostMarkdown(post, profile.slug)
  }
}

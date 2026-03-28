export interface Profile {
  id: string
  user_id: string
  slug: string
  display_name: string
  title: string | null
  location: string | null
  website: string | null
  bio: string | null
  markdown_content: string
  outbound_links: string[]
  company_links: string[]
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  user_id: string
  slug: string
  name: string
  tagline: string | null
  website: string | null
  bio: string | null
  markdown_content: string
  outbound_links: string[]
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  profile_id: string
  slug: string
  title: string | null
  markdown_content: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Follow {
  id: string
  follower_id: string
  followee_id: string
  created_at: string
}

export interface Reaction {
  id: string
  profile_id: string
  post_id: string
  type: string
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  profile_id: string
  body: string
  created_at: string
  updated_at: string
  profile?: Pick<Profile, 'slug' | 'display_name'>
}

export interface Notification {
  id: string
  recipient_id: string
  type: 'follow' | 'like' | 'comment'
  actor_id: string | null
  post_id: string | null
  comment_id: string | null
  read: boolean
  created_at: string
  actor?: Pick<Profile, 'slug' | 'display_name'>
  post?: Pick<Post, 'slug' | 'title'>
}

export interface WikiLink {
  id: string
  source_post_id: string | null
  source_profile_id: string | null
  target_slug: string
  resolved: boolean
  created_at: string
}

export interface SearchResult {
  slug: string
  display_name: string
}

export interface ExperienceEntry {
  id: string
  profile_id: string
  company_name: string
  company_slug: string | null
  title: string
  start_year: number
  start_month: number | null
  end_year: number | null
  end_month: number | null
  is_current: boolean
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

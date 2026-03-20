export interface Profile {
  id: string
  user_id: string
  slug: string
  display_name: string
  bio: string | null
  content: string | null
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  profile_id: string
  slug: string
  title: string | null
  content: string
  created_at: string
  updated_at: string
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

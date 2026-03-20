export interface Profile {
  id: string
  slug: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  markdown_content: string
  outbound_links: string[]
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  slug: string
  profile_id: string
  profile_slug: string
  title: string | null
  markdown_content: string
  outbound_links: string[]
  created_at: string
  updated_at: string
}

export interface Link {
  id: string
  source_type: 'profile' | 'post'
  source_id: string
  target_slug: string
  target_type: 'profile' | 'company'
  created_at: string
}

export interface GraphJson {
  entity: string
  url: string
  outbound: string[]
  inbound: string[]
}

export interface Profile {
  id: string
  user_id: string
  slug: string
  display_name: string
  title: string | null
  location: string | null
  website: string | null
  bio: string | null
  avatar_url: string | null
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

export interface CompanyMember {
  company_id: string
  profile_id: string
  role: 'admin'
  created_at: string
  profile?: Pick<Profile, 'id' | 'slug' | 'display_name' | 'user_id' | 'avatar_url'>
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

export interface Repost {
  id: string
  profile_id: string
  original_post_id: string
  comment: string | null
  created_at: string
}

export interface Notification {
  id: string
  recipient_id: string
  type: 'follow' | 'company_follow' | 'like' | 'comment' | 'endorse' | 'recommendation' | 'repost'
  actor_id: string | null
  post_id: string | null
  comment_id: string | null
  skill_id: string | null
  skill_name: string | null
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

export interface JobListing {
  id: string
  company_id: string
  title: string
  location: string | null
  type: 'full-time' | 'part-time' | 'contract' | 'internship'
  description_md: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  created_at: string
  other_profile?: Pick<Profile, 'id' | 'slug' | 'display_name' | 'avatar_url'>
  last_message?: Pick<Message, 'body' | 'created_at'>
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
  sender?: Pick<Profile, 'id' | 'slug' | 'display_name'>
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

export interface EducationEntry {
  id: string
  profile_id: string
  school: string
  degree: string | null
  field_of_study: string | null
  start_year: number
  start_month: number | null
  end_year: number | null
  end_month: number | null
  is_current: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProfileSkill {
  id: string
  profile_id: string
  name: string
  sort_order: number
  created_at: string
  endorsement_count?: number
  viewer_has_endorsed?: boolean
}

export interface Recommendation {
  id: string
  author_id: string
  recipient_id: string
  body: string
  visible: boolean
  created_at: string
  updated_at: string
  author?: Pick<Profile, 'slug' | 'display_name'>
}

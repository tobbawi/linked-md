// Profile completeness score — pure computation, no DB access.
// Shown in editor sidebar only; never exposed on public profile.

export interface CompletenessInput {
  has_avatar: boolean
  has_bio: boolean
  has_experience: boolean
  has_education: boolean
  has_skills: boolean
  has_2plus_posts: boolean
  has_website: boolean
}

export interface CompletenessHint {
  label: string
  pts: number
}

export interface CompletenessResult {
  score: number
  hints: CompletenessHint[]
}

const CRITERIA: Array<{ key: keyof CompletenessInput; label: string; pts: number }> = [
  { key: 'has_avatar',      label: 'Add a photo',        pts: 20 },
  { key: 'has_bio',         label: 'Add a bio',          pts: 15 },
  { key: 'has_experience',  label: 'Add experience',     pts: 15 },
  { key: 'has_education',   label: 'Add education',      pts: 15 },
  { key: 'has_skills',      label: 'Add skills',         pts: 15 },
  { key: 'has_2plus_posts', label: 'Add a second post',  pts: 10 },
  { key: 'has_website',     label: 'Add a website',      pts: 10 },
]

export function computeCompleteness(input: CompletenessInput): CompletenessResult {
  let score = 0
  const hints: CompletenessHint[] = []

  for (const criterion of CRITERIA) {
    if (input[criterion.key]) {
      score += criterion.pts
    } else {
      hints.push({ label: criterion.label, pts: criterion.pts })
    }
  }

  return { score, hints }
}

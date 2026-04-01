// Shared date formatting utilities for experience and education entries.
// Extracted from ExperienceSection to avoid duplication across components and exports.

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface DateEntry {
  start_year: number
  start_month: number | null
  end_year: number | null
  end_month: number | null
  is_current: boolean
}

export function formatPeriod(entry: DateEntry): string {
  const startMonth = entry.start_month ? `${MONTH_NAMES[entry.start_month - 1]} ` : ''
  const start = `${startMonth}${entry.start_year}`
  if (entry.is_current) return `${start} – present`
  if (!entry.end_year) return start
  const endMonth = entry.end_month ? `${MONTH_NAMES[entry.end_month - 1]} ` : ''
  return `${start} – ${endMonth}${entry.end_year}`
}

export function getDuration(entry: DateEntry): string {
  const endYear = entry.is_current ? new Date().getFullYear() : (entry.end_year ?? entry.start_year)
  const endMonth = entry.is_current
    ? new Date().getMonth() + 1
    : (entry.end_month ?? entry.start_month ?? 1)
  const startMonth = entry.start_month ?? 1
  const totalMonths = (endYear - entry.start_year) * 12 + (endMonth - startMonth)
  if (totalMonths < 1) return ''
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  const parts: string[] = []
  if (years > 0) parts.push(`${years}y`)
  if (months > 0 || years === 0) parts.push(`${months}mo`)
  return parts.join(' ')
}

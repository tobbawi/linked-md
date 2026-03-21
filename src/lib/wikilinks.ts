/**
 * Wikilink resolution utilities.
 *
 * Supported syntax:
 *   [[Name]]              → auto-resolve (profile first, then company)
 *   [[company:Name]]      → force company resolution at /company/slug
 *   [[profile:Name]]      → force profile resolution at /profile/slug
 *   [[Name|Display Text]] → link to Name, render as "Display Text"
 *   [[company:Name|Display Text]] → company link with display override
 *
 * Slugs are derived from Name with toSlug(). You can link by exact slug
 * (e.g. [[jane-doe]]) or by display name (e.g. [[Jane Doe]]).
 */

// Matches [[target]] or [[target|display]] with optional type prefix
const WIKILINK_REGEX = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g

export type WikilinkType = 'profile' | 'company' | 'auto'

/** A parsed wikilink reference extracted from content. */
export interface WikilinkRef {
  /** The full raw match, e.g. "[[company:Acme|Acme Corp]]" */
  raw: string
  /** The resolved slug for the link target, e.g. "acme" */
  slug: string
  /** The text to display, e.g. "Acme Corp" */
  display: string
  /** Explicit type from prefix, or 'auto' if no prefix */
  type: WikilinkType
}

/**
 * Convert a display name / wikilink target to a URL slug.
 * Strips type prefixes before slugifying.
 * e.g. "Jane Doe" → "jane-doe", "company:Acme Corp" → "acme-corp"
 */
export function toSlug(name: string): string {
  const stripped = name.replace(/^(?:profile|company):/, '')
  return stripped
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Parse the type prefix from a raw target, e.g. "company:Acme" → "company" */
function parseType(target: string): WikilinkType {
  if (target.startsWith('company:')) return 'company'
  if (target.startsWith('profile:')) return 'profile'
  return 'auto'
}

/** Strip type prefix for display, e.g. "company:Acme" → "Acme" */
function stripPrefix(target: string): string {
  return target.replace(/^(?:profile|company):/, '')
}

/**
 * Extract all wikilink targets from content as plain slug strings.
 * Only returns slugs for non-company links (profile / auto type).
 * Used to populate profiles.outbound_links.
 */
export function extractWikilinks(content: string): string[] {
  const matches: string[] = []
  const re = new RegExp(WIKILINK_REGEX.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    const target = match[1]
    const type = parseType(target)
    if (type !== 'company') {
      matches.push(stripPrefix(target))
    }
  }
  return matches
}

/**
 * Extract company-typed wikilinks from content as slug strings.
 * Used to populate profiles.company_links.
 */
export function extractCompanyLinks(content: string): string[] {
  const matches: string[] = []
  const re = new RegExp(WIKILINK_REGEX.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    const target = match[1]
    if (parseType(target) === 'company') {
      matches.push(toSlug(target))
    }
  }
  return matches
}

/**
 * Extract all wikilink references as typed objects.
 */
export function extractWikilinkRefs(content: string): WikilinkRef[] {
  const refs: WikilinkRef[] = []
  const re = new RegExp(WIKILINK_REGEX.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    const target = match[1]
    const displayOverride = match[2]
    const type = parseType(target)
    const cleanName = stripPrefix(target)
    refs.push({
      raw: match[0],
      slug: toSlug(target),
      display: displayOverride ?? cleanName,
      type,
    })
  }
  return refs
}

/** Escape HTML special characters to prevent XSS in dangerouslySetInnerHTML contexts. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Render wikilinks in content to HTML anchor tags.
 *
 * @param content         Raw content with [[...]] links
 * @param profileSlugs    Set of known profile slugs
 * @param companySlugs    Set of known company slugs (optional)
 * @returns HTML string with wikilinks replaced by <a> or <span>
 */
export function renderWikilinks(
  content: string,
  profileSlugs: Set<string>,
  companySlugs?: Set<string>
): string {
  const re = new RegExp(WIKILINK_REGEX.source, 'g')
  return content.replace(re, (_match, target: string, displayOverride?: string) => {
    const type = parseType(target)
    const slug = toSlug(target)
    const display = escapeHtml(displayOverride ?? stripPrefix(target))

    if (type === 'company') {
      if (companySlugs?.has(slug)) {
        return `<a href="/company/${slug}" class="wikilink-company">${display}</a>`
      }
      return `<span class="wikilink-unresolved" title="Company not found">[[${escapeHtml(stripPrefix(target))}]]</span>`
    }

    if (type === 'profile' || type === 'auto') {
      if (profileSlugs.has(slug)) {
        return `<a href="/profile/${slug}" class="wikilink-resolved">${display}</a>`
      }
      // Auto-type falls through to company check
      if (type === 'auto' && companySlugs?.has(slug)) {
        return `<a href="/company/${slug}" class="wikilink-company">${display}</a>`
      }
      return `<span class="wikilink-unresolved" title="Profile not found">[[${escapeHtml(stripPrefix(target))}]]</span>`
    }

    return _match
  })
}

/**
 * Parse wikilinks into typed segments for React rendering.
 * Avoids dangerouslySetInnerHTML.
 */
export type WikilinkSegment =
  | { type: 'text'; content: string }
  | { type: 'profile'; name: string; slug: string; display: string }
  | { type: 'company'; name: string; slug: string; display: string }
  | { type: 'unresolved'; name: string; display: string }

export function parseWikilinkSegments(
  content: string,
  profileSlugs: Set<string>,
  companySlugs?: Set<string>
): WikilinkSegment[] {
  const segments: WikilinkSegment[] = []
  let lastIndex = 0
  const re = new RegExp(WIKILINK_REGEX.source, 'g')
  let match: RegExpExecArray | null

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    const target = match[1]
    const displayOverride = match[2]
    const linkType = parseType(target)
    const slug = toSlug(target)
    const display = displayOverride ?? stripPrefix(target)
    const name = stripPrefix(target)

    if (linkType === 'company') {
      if (companySlugs?.has(slug)) {
        segments.push({ type: 'company', name, slug, display })
      } else {
        segments.push({ type: 'unresolved', name, display })
      }
    } else {
      if (profileSlugs.has(slug)) {
        segments.push({ type: 'profile', name, slug, display })
      } else if (linkType === 'auto' && companySlugs?.has(slug)) {
        segments.push({ type: 'company', name, slug, display })
      } else {
        segments.push({ type: 'unresolved', name, display })
      }
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) })
  }

  return segments
}

/**
 * Wikilink resolution utilities.
 *
 * Parses [[Name]] syntax in markdown content and renders resolved links
 * as styled anchors. Unresolved links render as muted plain text.
 */

const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g

/**
 * Extract all wikilink targets from a content string.
 * Returns an array of raw link targets (e.g. "Jane Doe" from [[Jane Doe]]).
 */
export function extractWikilinks(content: string): string[] {
  const matches: string[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(WIKILINK_REGEX.source, 'g')
  while ((match = re.exec(content)) !== null) {
    matches.push(match[1])
  }
  return matches
}

/**
 * Convert a display name / wikilink target to a URL slug.
 * e.g. "Jane Doe" → "jane-doe"
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Render wikilinks in a markdown content string to HTML anchor tags.
 *
 * @param content - Raw markdown/text content potentially containing [[Name]] links
 * @param resolvedSlugs - Set of known profile slugs; links that resolve to a slug get full styling
 * @returns HTML string with wikilinks replaced by <a> or <span> elements
 */
export function renderWikilinks(
  content: string,
  resolvedSlugs: Set<string>
): string {
  return content.replace(WIKILINK_REGEX, (_match, name: string) => {
    const slug = toSlug(name)
    if (resolvedSlugs.has(slug)) {
      return `<a href="/profile/${slug}" class="wikilink-resolved">${name}</a>`
    }
    return `<span class="wikilink-unresolved" title="Profile not found">[[${name}]]</span>`
  })
}

/**
 * Render wikilinks for safe inline HTML injection.
 * Returns an array of segments — plain strings and link objects.
 * Useful for React rendering without dangerouslySetInnerHTML.
 */
export type WikilinkSegment =
  | { type: 'text'; content: string }
  | { type: 'resolved'; name: string; slug: string }
  | { type: 'unresolved'; name: string }

export function parseWikilinkSegments(
  content: string,
  resolvedSlugs: Set<string>
): WikilinkSegment[] {
  const segments: WikilinkSegment[] = []
  let lastIndex = 0
  const re = new RegExp(WIKILINK_REGEX.source, 'g')
  let match: RegExpExecArray | null

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    const name = match[1]
    const slug = toSlug(name)
    if (resolvedSlugs.has(slug)) {
      segments.push({ type: 'resolved', name, slug })
    } else {
      segments.push({ type: 'unresolved', name })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) })
  }

  return segments
}

/**
 * Wikilink resolution: [[Name]] → slug lookup → href or plain text
 *
 * Resolution algorithm:
 *   1. Slugify the display name: lowercase, spaces→hyphens, strip non-alphanumeric
 *   2. Exact match against known slugs (case-insensitive)
 *   3. If match: render as <a href="/profile/{slug}">Name</a> with wikilink styling
 *   4. If no match: render as plain [[Name]] with tooltip "Search for Name"
 */

export function slugifyWikilink(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function parseWikilinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g
  const links: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1])
  }
  return Array.from(new Set(links))
}

export function renderWikilinks(
  content: string,
  resolvedSlugs: Set<string>
): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, name) => {
    const slug = slugifyWikilink(name)
    if (resolvedSlugs.has(slug)) {
      return `<a href="/profile/${slug}" class="wikilink-resolved">${name}</a>`
    }
    return `<span class="wikilink-unresolved" title="Search for ${name}">[[${name}]]</span>`
  })
}

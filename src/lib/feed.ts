/**
 * Merge two arrays of feed items, deduplicate by id, and sort newest-first.
 * Uses composite (created_at DESC, id DESC) tie-break to prevent tie-skipping.
 */
export function mergeFeedItems<T extends { id: string; created_at: string }>(
  a: T[],
  b: T[]
): T[] {
  const merged = [...a, ...b]
  const deduped = Array.from(new Map(merged.map((item) => [item.id, item])).values())
  return deduped.sort((x, y) => {
    const diff = new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
    return diff !== 0 ? diff : x.id < y.id ? 1 : -1
  })
}

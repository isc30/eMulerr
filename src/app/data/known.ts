import { createJsonDb } from "~/utils/jsonDb"
import { logger } from "~/utils/logger"
import { testQuery } from "./search"
import { staleWhileRevalidate } from "~/utils/memoize"

const knownDb = createJsonDb<{ hash: string, size: number, name: string }[]>(
  "/config/cache/known.json",
  [])

export function trackKnown(known: { hash: string, size: number, name: string }[]) {
  let tracked = 0
  known.forEach(({ hash, size, name }) => {
    const entry = knownDb.data.find(i => i.hash === hash && i.size === size && i.name === name)
    if (!entry) {
      tracked++
      knownDb.data.push({ hash, size, name })
    }
  })

  if (tracked) {
    logger.info("Tracked", tracked, "new files")
  }
}

export const searchKnown = staleWhileRevalidate(async function (q: string) {
  logger.info(`[local] Searching: ${q}`)
  const known = knownDb.data
  const matches = known.filter(k => testQuery(q, k.name))
  logger.info(`[local] Search finished with ${matches.length} items`)
  return matches.map(m => ({
    name: m.name,
    hash: m.hash,
    size: m.size,
    sources: 0,
    present: false
  }))
}, {
  stalled: 1000 * 60,
  expired: 1000 * 60,
  shouldCache: r => r.length > 0
})

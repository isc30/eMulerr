import type AmuleClient from '#/amule-ec-node/AmuleClient.mjs'
import { normalizeEd2kHash, sameEd2kHash } from './links'
import { skipFalsy } from './array'

export { normalizeEd2kHash, sameEd2kHash }

export function parseTorrentHash(
  rawHash: string | null | undefined,
): string | null {
  return normalizeEd2kHash(rawHash)
}

export function hasTorrentHashInput(
  rawHashes: string | null | undefined,
): boolean {
  const value = rawHashes?.toString().trim()
  if (!value) {
    return false
  }

  if (value.toLowerCase() === 'all') {
    return true
  }

  return value
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .some((part) => normalizeEd2kHash(part) !== null)
}

export function ed2kHashSet(hashes: string[]): Set<string> {
  return new Set(
    hashes.flatMap((hash) => {
      const normalized = normalizeEd2kHash(hash)
      return normalized ? [normalized] : []
    }),
  )
}

export async function resolveTorrentHashes(
  amule: AmuleClient,
  rawHashes: string | null | undefined,
): Promise<string[]> {
  const value = rawHashes?.toString().trim()
  if (!value) {
    return []
  }

  if (value.toLowerCase() === 'all') {
    const downloads = await amule.getDownloadQueue()
    return downloads
      .map((d) => d.fileHash)
      .filter((h): h is string => !!h)
      .map((h) => normalizeEd2kHash(h))
      .filter((h): h is string => !!h)
  }

  return value
    .split('|')
    .filter(skipFalsy)
    .map((h) => normalizeEd2kHash(h))
    .filter((h): h is string => !!h)
}

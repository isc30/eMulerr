import { describe, expect, it, vi } from 'vitest'
import {
  ed2kHashSet,
  hasTorrentHashInput,
  normalizeEd2kHash,
  parseTorrentHash,
  resolveTorrentHashes,
  sameEd2kHash,
} from './torrents'

const ED2K = 'A1B2C3D4E5F60718293A4B5C6D7E8F90'
const BTIH = `${ED2K.toLowerCase()}00000000`

describe('parseTorrentHash', () => {
  it('accepts exact 32-hex ed2k', () => {
    expect(parseTorrentHash(ED2K)).toBe(ED2K)
    expect(normalizeEd2kHash(ED2K.toLowerCase())).toBe(ED2K)
  })

  it('accepts exact 40-hex amulerr btih', () => {
    expect(parseTorrentHash(BTIH)).toBe(ED2K)
  })

  it('rejects invalid hashes', () => {
    expect(parseTorrentHash('not-a-hash')).toBeNull()
    expect(parseTorrentHash(`${ED2K}garbage`)).toBeNull()
    expect(parseTorrentHash('b'.repeat(40))).toBeNull()
    expect(parseTorrentHash('|')).toBeNull()
    expect(parseTorrentHash('')).toBeNull()
  })
})

describe('sameEd2kHash', () => {
  it('matches hashes case-insensitively', () => {
    expect(sameEd2kHash(ED2K, ED2K.toLowerCase())).toBe(true)
    expect(sameEd2kHash(ED2K, BTIH)).toBe(true)
  })
})

describe('ed2kHashSet', () => {
  it('normalizes hashes in a set', () => {
    expect(ed2kHashSet([ED2K.toLowerCase(), 'bad'])).toEqual(new Set([ED2K]))
  })
})

describe('hasTorrentHashInput', () => {
  it('accepts all and valid hashes only', () => {
    expect(hasTorrentHashInput('all')).toBe(true)
    expect(hasTorrentHashInput(ED2K)).toBe(true)
    expect(hasTorrentHashInput('|')).toBe(false)
    expect(hasTorrentHashInput('  |  ')).toBe(false)
    expect(hasTorrentHashInput('bad')).toBe(false)
  })
})

describe('resolveTorrentHashes', () => {
  it('expands hashes=all from download queue', async () => {
    const amule = {
      getDownloadQueue: vi.fn(async () => [
        { fileHash: ED2K },
        { fileHash: undefined },
      ]),
    }

    const hashes = await resolveTorrentHashes(amule as never, 'all')
    expect(hashes).toEqual([ED2K])
  })

  it('filters invalid pipe-separated hashes', async () => {
    const amule = { getDownloadQueue: vi.fn() }
    const hashes = await resolveTorrentHashes(amule as never, `${ED2K}|bad|`)
    expect(hashes).toEqual([ED2K])
  })
})

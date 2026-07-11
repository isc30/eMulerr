import { describe, expect, it } from 'vitest'
import {
  fromEd2kLink,
  fromMagnetLink,
  fromQbittorrentHashStrict,
  isAmulerrBtih,
  isValidEd2kHash,
  normalizeEd2kHash,
  sameEd2kHash,
  toEd2kLink,
  toMagnetLink,
  toQbittorrentHash,
  toQbittorrentHashStrict,
} from './links'

const ED2K = 'A1B2C3D4E5F60718293A4B5C6D7E8F90'
const BTIH = toQbittorrentHashStrict(ED2K)!

describe('hash helpers', () => {
  it('validates exact 32-hex ed2k hashes', () => {
    expect(isValidEd2kHash(ED2K)).toBe(true)
    expect(isValidEd2kHash(`${ED2K}00`)).toBe(false)
    expect(isValidEd2kHash('not-a-hash')).toBe(false)
  })

  it('normalizes 32-hex and padded 40-hex btih', () => {
    expect(normalizeEd2kHash(ED2K)).toBe(ED2K)
    expect(normalizeEd2kHash(ED2K.toLowerCase())).toBe(ED2K)
    expect(normalizeEd2kHash(BTIH)).toBe(ED2K)
  })

  it('rejects real non-padded BitTorrent btih and malformed hashes', () => {
    expect(normalizeEd2kHash('b'.repeat(40))).toBeNull()
    expect(normalizeEd2kHash(`${ED2K}garbage`)).toBeNull()
    expect(normalizeEd2kHash('')).toBeNull()
  })

  it('maps ed2k to strict qBittorrent btih', () => {
    expect(toQbittorrentHashStrict(ED2K)).toBe(`${ED2K.toLowerCase()}00000000`)
    expect(toQbittorrentHashStrict('bad')).toBeNull()
    expect(toQbittorrentHash(ED2K)).toBe(`${ED2K.toLowerCase()}00000000`)
  })

  it('maps strict qBittorrent btih back to ed2k', () => {
    expect(fromQbittorrentHashStrict(BTIH)).toBe(ED2K)
    expect(fromQbittorrentHashStrict('a'.repeat(40))).toBeNull()
  })

  it('compares ed2k hashes case-insensitively', () => {
    expect(sameEd2kHash(ED2K, ED2K.toLowerCase())).toBe(true)
    expect(sameEd2kHash(ED2K, BTIH)).toBe(true)
    expect(sameEd2kHash(ED2K, 'B'.repeat(32))).toBe(false)
  })

  it('recognizes amulerr padded btih', () => {
    expect(isAmulerrBtih(BTIH)).toBe(true)
    expect(isAmulerrBtih('a'.repeat(40))).toBe(false)
  })
})

describe('fromMagnetLink', () => {
  const magnet = toMagnetLink(ED2K, 'Test Book', 12345)

  it('parses amulerr-generated magnets', () => {
    expect(fromMagnetLink(magnet)).toEqual({
      hash: ED2K,
      name: 'Test Book',
      size: 12345,
    })
  })

  it('rejects non-magnet protocols', () => {
    expect(() => fromMagnetLink('http://example.com')).toThrow(
      'Invalid magnet link',
    )
  })

  it('rejects random non-amulerr 40-hex btih', () => {
    const fake = magnet.replace(BTIH, 'b'.repeat(40))
    expect(() => fromMagnetLink(fake)).toThrow('Invalid magnet link')
  })

  it('accepts filenames containing a literal percent sign', () => {
    const percentName = '50% Off.mkv'
    const withPercent = toMagnetLink(ED2K, percentName, 12345)
    expect(fromMagnetLink(withPercent)).toEqual({
      hash: ED2K,
      name: percentName,
      size: 12345,
    })
  })

  it('rejects invalid size', () => {
    const bad = magnet.replace('xl=12345', 'xl=12abc')
    expect(() => fromMagnetLink(bad)).toThrow('Invalid magnet link')
  })

  it('rejects extra tracker parameters before xl', () => {
    const withExtra = magnet.replace(
      `&xl=12345`,
      `&tr=http%3A%2F%2Ftracker&xl=12345`,
    )
    expect(() => fromMagnetLink(withExtra)).toThrow('Invalid magnet link')
  })

  it('accepts trailing parameters after tr=http://amulerr', () => {
    const withTrailing = `${magnet}&foo=bar`
    expect(fromMagnetLink(withTrailing)).toEqual({
      hash: ED2K,
      name: 'Test Book',
      size: 12345,
    })
  })

  it('rejects trackers that only prefix-match http://amulerr', () => {
    const evilTracker = magnet.replace(
      '&tr=http://amulerr',
      '&tr=http://amulerr.evil',
    )
    expect(() => fromMagnetLink(evilTracker)).toThrow('Invalid magnet link')
  })
})

describe('fromEd2kLink', () => {
  const ed2k = toEd2kLink(ED2K, 'Test Book', 12345)

  it('parses strict ed2k links', () => {
    expect(fromEd2kLink(ed2k)).toEqual({
      hash: ED2K,
      name: 'Test Book',
      size: 12345,
    })
  })

  it('rejects invalid hash length', () => {
    expect(() =>
      fromEd2kLink(`ed2k://|file|book.pdf|100|${'a'.repeat(31)}|/`),
    ).toThrow('Invalid ed2k link')
  })

  it('rejects non-numeric size', () => {
    expect(() => fromEd2kLink(`ed2k://|file|book.pdf|12abc|${ED2K}|/`)).toThrow(
      'Invalid ed2k link',
    )
  })

  it('rejects malformed percent-encoding in name', () => {
    expect(() => fromEd2kLink(`ed2k://|file|%E0%A4%A|100|${ED2K}|/`)).toThrow(
      'Invalid ed2k link',
    )
  })
})

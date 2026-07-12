import { describe, expect, it } from 'vitest'
import { toMagnetLink } from './links'

const ED2K = 'A1B2C3D4E5F60718293A4B5C6D7E8F90'

describe('toMagnetLink', () => {
  it('generates aMulerr synthetic btih magnets', () => {
    const magnet = toMagnetLink(ED2K, 'Test Book', 12345)

    expect(magnet).toBe(
      'magnet:?xt=urn:btih:a1b2c3d4e5f60718293a4b5c6d7e8f9000000000&dn=Test%20Book&xl=12345&tr=http://amulerr',
    )
  })

  it('rejects invalid ed2k hashes', () => {
    expect(() => toMagnetLink('not-a-hash', 'book.pdf', 100)).toThrow(
      'Invalid ed2k hash',
    )
  })
})

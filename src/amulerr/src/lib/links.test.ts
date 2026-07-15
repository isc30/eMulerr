import { describe, expect, it } from 'vitest'
import { toMagnetLink } from './links'

describe('toMagnetLink', () => {
  it('generates aMulerr synthetic btih magnets', () => {
    const magnet = toMagnetLink('A1B2C3D4E5F60718293A4B5C6D7E8F90', 'Test Book', 12345)
    expect(magnet).not.toBeNull()
  })

  it('rejects invalid ed2k hashes', () => {
    const magnet = toMagnetLink('not-a-hash', 'book.pdf', 100)
    expect(magnet).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { itemsResponse } from './indexer'

const ED2K = 'A1B2C3D4E5F60718293A4B5C6D7E8F90'

describe('itemsResponse', () => {
  it('skips search results with invalid hashes instead of failing the feed', () => {
    const xml = itemsResponse(
      [
        { fileName: 'good.pdf', fileHash: ED2K, fileSize: 100, sourceCount: 3 },
        {
          fileName: 'bad.pdf',
          fileHash: 'not-a-hash',
          fileSize: 50,
          sourceCount: 1,
        },
      ],
      [7000],
    )

    expect(xml).toContain('total="1"')
    expect(xml).toContain('good.pdf')
    expect(xml).not.toContain('bad.pdf')
  })
})

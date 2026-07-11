import { skipFalsy } from './array'
import { encode } from 'html-entities'
import { buildRFC822Date } from './time'
import type { searchAll } from '#/amule'
import { toMagnetLink } from './links'

export const fakeItem = {
  fileName: 'FAKE',
  fileHash: '00000000000000000000000000000000',
  fileSize: 1,
  sourceCount: 1,
} satisfies Awaited<ReturnType<typeof searchAll>>[number]

export const emptyResponse = (offset: string) => `
  <rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
    <channel>
      <torznab:response offset="${offset}" total="0"/>
    </channel>
  </rss>`

export const itemsResponse = (
  searchResults: Awaited<ReturnType<typeof searchAll>>,
  categories: number[],
) => {
  const items = searchResults.flatMap((item) => {
    let magnet: string
    try {
      magnet = toMagnetLink(item.fileHash, item.fileName, item.fileSize)
    } catch {
      return []
    }

    return [
      `
          <item>
            <title>${encode(item.fileName)}</title>
            <guid>${item.fileHash}-${encode(item.fileName)}</guid>
            <link>${encode(magnet)}</link>
            <pubDate>${buildRFC822Date(new Date())}</pubDate>
            <enclosure url="${encode(magnet)}" length="${item.fileSize}" type="application/x-bittorrent" />
            <torznab:attr name="size" value="${item.fileSize}" />
            <torznab:attr name="magneturl" value="${encode(magnet)}" />
            ${categories.map((c) => `<torznab:attr name="category" value="${c}" />`).join('')}
            <torznab:attr name="seeders" value="${item.sourceCount}" />
            <torznab:attr name="downloadvolumefactor" value="0" />
            <torznab:attr name="uploadvolumefactor" value="0" />
            <torznab:attr name="minimumratio" value="0" />
            <torznab:attr name="minimumseedtime" value="0" />
            <torznab:attr name="tag" value="freeleech" />
          </item>`,
    ]
  })

  return `
  <rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
    <channel>
      <torznab:response offset="0" total="${items.length}"/>
      ${items.join('')}
    </channel>
  </rss>
  `
}

export function group<T>(
  arr: T[],
  operator: 'AND' | 'OR',
  parenthesis: boolean,
) {
  arr = arr.filter(skipFalsy)

  const joined =
    operator === 'OR'
      ? arr.join(` ${operator} `)
      : arr
          .sort(
            // move parenthesis to the end
            (a, b) =>
              (typeof a === 'string' && a.startsWith('(') ? 1 : 0) -
              (typeof b === 'string' && b.startsWith('(') ? 1 : 0),
          )
          .reduce(
            (prev, curr) =>
              prev === ''
                ? `${curr}`
                : prev.endsWith(')') ||
                    (typeof curr === 'string' && curr.startsWith('('))
                  ? `${prev} AND ${curr}`
                  : `${prev} ${curr}`,
            '',
          )

  if (!parenthesis) {
    return joined
  }

  return arr.length > 1 ? `(${joined})` : `${arr[0] ?? ''}`
}

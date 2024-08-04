import { skipFalsy } from "./array"
import { encode } from "html-entities"
import { buildRFC822Date } from "./time"
import { logger } from "./logger"
import { readableSize } from "./math"
import { searchAndWaitForResults } from "~/data/search"

export const fakeItem = {
  name: "FAKE",
  short_name: "FAKE",
  hash: "00000000000000000000000000000000",
  size: 1,
  sources: 1,
  present: false,
  magnetLink: "http://emulerr/fake",
  ed2kLink: "http://emulerr/fake",
}

export const emptyResponse = () => `
  <rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
    <channel>
      <torznab:response offset="0" total="0"/>
    </channel>
  </rss>`

export async function search(q: string) {
  const searchResults = await searchAndWaitForResults(q)
  const { allowed, skipped } = searchResults.reduce((prev, curr) => {
    if (["mp4", "mkv", "avi", "wmv", "mpeg", "mpg"].some((ext) => curr.name.endsWith(`.${ext}`))) {
      prev.allowed.push(curr)
    } else {
      prev.skipped.push(curr)
    }
    return prev
  }, { allowed: [] as typeof searchResults, skipped: [] as typeof searchResults })

  if (skipped.length > 0) {
    logger.debug(`${skipped.length} results excluded with unknown file extensions:`)
    skipped.forEach(r => {
      logger.debug(`\t- ${r.name} (${readableSize(r.size)})`)
    })
  }

  return allowed
}

export const itemsResponse = (
  searchResults: Awaited<ReturnType<typeof search>>,
  categories: number[]
) => `
  <rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
    <channel>
      <torznab:response offset="0" total="${searchResults.length}"/>
      ${searchResults.map(
  (item) => `
          <item>
            <title>${encode(item.name)}</title>
            <guid>${item.hash}-${encode(item.name)}</guid>
            <pubDate>${buildRFC822Date(new Date())}</pubDate>
            <enclosure url="${encode(item.magnetLink)}" length="${item.size}" type="application/x-bittorrent" />
            <torznab:attr name="size" value="${item.size}" />
            ${categories.map((c) => `<torznab:attr name="category" value="${c}" />`).join("")}
            <torznab:attr name="seeders" value="${item.sources}" />
            <torznab:attr name="downloadvolumefactor" value="0" />
            <torznab:attr name="uploadvolumefactor" value="0" />
            <torznab:attr name="minimumratio" value="0" />
            <torznab:attr name="minimumseedtime" value="0" />
            <torznab:attr name="tag" value="freeleech" />
          </item>`
)}
    </channel>
  </rss>
  `

export function group<T>(
  arr: T[],
  operator: "AND" | "OR",
  parenthesis: boolean
) {
  arr = arr.filter(skipFalsy)

  const joined =
    operator === "OR"
      ? arr.join(` ${operator} `)
      : arr
        .sort(
          // move parenthesis to the end
          (a, b) =>
            (typeof a === "string" && a.startsWith("(") ? 1 : 0) -
            (typeof b === "string" && b.startsWith("(") ? 1 : 0)
        )
        .reduce(
          (prev, curr) =>
            prev === ""
              ? `${curr}`
              : prev.endsWith(")") ||
                (typeof curr === "string" && curr.startsWith("("))
                ? `${prev} AND ${curr}`
                : `${prev} ${curr}`,
          ""
        )

  if (!parenthesis) {
    return joined
  }

  return arr.length > 1 ? `(${joined})` : `${arr[0] ?? ""}`
}

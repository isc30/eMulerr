import { LoaderFunction, json } from "@remix-run/node"
import { amuleGetDownloads } from "amule/amule"
import { existsSync } from "fs"
import { getDownloadClientFiles } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

export const loader = (async ({ request }) => {
  logger.debug("URL", request.url)
  const url = new URL(request.url)
  const category = url.searchParams.get("category")
  const files = await getDownloadClientFiles()

  return json([
    ...files
      .filter((d) => {
        return !category || d.meta?.category === category
      })
      .map((f) => ({
        // qBittorrent structure
        hash: f.hash,
        name: f.name,
        size: f.size,
        size_done: f.size_done,
        progress:
          f.progress === 1 ? 1 : Math.min(0.999, Math.max(f.progress, 0.001)),
        dlspeed: f.speed,
        eta: f.eta,
        state: statusToQbittorrentState(f.status_str),
        content_path: contentPath(f.name),
        category: f.meta?.category,
      })),
  ])
}) satisfies LoaderFunction

export const action = loader

function contentPath(name: string) {
  if (existsSync(`/downloads/complete/${name}`)) {
    return `/downloads/complete/${name}`
  }

  if (existsSync(`/tmp/shared/${name}`)) {
    return `/tmp/shared/${name}`
  }

  return undefined
}

function statusToQbittorrentState(
  status: Awaited<ReturnType<typeof amuleGetDownloads>>[0]["status_str"]
) {
  switch (status) {
    case "downloading":
      return "downloading"
    case "downloaded":
      return "pausedUP"
    case "stalled":
      return "stalledDL"
    case "error":
      return "error"
    case "completing":
      return "moving"
    case "stopped":
      return "pausedDL"
  }
}

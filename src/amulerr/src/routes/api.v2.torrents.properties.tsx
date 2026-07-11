import { useAmule } from '#/amule'
import { sameEd2kHash } from '#/lib/links'
import { parseTorrentHash } from '#/lib/torrents'
import { createFileRoute } from '@tanstack/react-router'

// https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-generic-properties
//
// Sonarr/Radarr IsTorrentLoaded() treats any HTTP-200 JSON body as "loaded" (no empty-object check).
// Missing torrents must return 404 so *rr does not mark a snatch complete prematurely.
//
// LazyLibrarian get_torrent() polls this after add; HTTP 404 is falsy (retries), which matches its loop.
export const Route = createFileRoute('/api/v2/torrents/properties')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const rawHash = url.searchParams.get('hash')

        if (!rawHash) {
          return new Response(null, { status: 404 })
        }

        const hash = parseTorrentHash(rawHash)
        if (!hash) {
          return new Response(null, { status: 404 })
        }

        const properties = await useAmule(async (amule) => {
          const downloads = await amule.getDownloadQueue()

          const download = downloads.find((item) =>
            sameEd2kHash(item.fileHash, hash),
          )
          if (download) {
            const categories = await amule.getCategories()
            const category = categories.find((c) => c.id === download.category)
            return {
              save_path: category?.path ?? '',
              name: download.fileName ?? '',
              total_size: download.fileSize ?? 0,
              total_downloaded: download.fileSizeDownloaded ?? 0,
              piece_size: 0,
              pieces_num: 0,
              pieces_have: 0,
              addition_date:
                Math.floor(Date.now() / 1000) -
                (download.downloadActiveTime ?? 0),
              completion_date: -1,
              seeds: download.sourceCount ?? 0,
              peers: download.sourceCountXfer ?? 0,
            }
          }

          const shared = await amule.getSharedFiles()
          const sharedFile = shared.find((item) =>
            sameEd2kHash(item.fileHash, hash),
          )
          if (sharedFile) {
            return {
              save_path: sharedFile.path ?? '',
              name: sharedFile.fileName ?? '',
              total_size: sharedFile.fileSize ?? 0,
              total_downloaded: sharedFile.fileSize ?? 0,
              piece_size: 0,
              pieces_num: 0,
              pieces_have: 0,
              addition_date: -1,
              completion_date: -1,
            }
          }

          return null
        })

        if (!properties) {
          return new Response(null, { status: 404 })
        }

        return Response.json(properties)
      },
    },
  },
})

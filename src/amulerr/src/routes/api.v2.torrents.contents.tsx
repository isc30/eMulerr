import {
  extractTorrentHash,
  getTorrentFilesResponse,
} from '#/lib/torrent-files'
import { createFileRoute } from '@tanstack/react-router'

// PyMedusa posts here (legacy qBittorrent name); same payload as GET /torrents/files.
export const Route = createFileRoute('/api/v2/torrents/contents')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawHash = await extractTorrentHash(request)
        return getTorrentFilesResponse(rawHash)
      },
      GET: async ({ request }) => {
        const rawHash = await extractTorrentHash(request)
        return getTorrentFilesResponse(rawHash)
      },
    },
  },
})

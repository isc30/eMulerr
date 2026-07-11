import {
  QBITTORRENT_APP_VERSION,
  qbittorrentPlainTextResponse,
} from '#/lib/qbittorrent'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/app/version')({
  server: {
    handlers: {
      GET: async () => qbittorrentPlainTextResponse(QBITTORRENT_APP_VERSION),
    },
  },
})

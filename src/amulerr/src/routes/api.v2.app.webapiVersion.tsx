import {
  QBITTORRENT_WEBAPI_VERSION,
  qbittorrentPlainTextResponse,
} from '#/lib/qbittorrent'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/app/webapiVersion')({
  server: {
    handlers: {
      GET: async () => qbittorrentPlainTextResponse(QBITTORRENT_WEBAPI_VERSION),
    },
  },
})

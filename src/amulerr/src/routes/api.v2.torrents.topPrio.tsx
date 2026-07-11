import { qbittorrentPlainTextResponse } from '#/lib/qbittorrent'
import { createFileRoute } from '@tanstack/react-router'

// No-op: aMule has no queue priority API; Radarr/Sonarr ignore 409 on real qBittorrent when queueing is off.
export const Route = createFileRoute('/api/v2/torrents/topPrio')({
  server: {
    handlers: {
      POST: async () => qbittorrentPlainTextResponse('Ok'),
    },
  },
})

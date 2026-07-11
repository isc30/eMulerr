import { qbittorrentPlainTextResponse } from '#/lib/qbittorrent'
import { createFileRoute } from '@tanstack/react-router'

// No-op: aMule has no force-start flag; clients call this after add when InitialState=ForceStart.
export const Route = createFileRoute('/api/v2/torrents/setForceStart')({
  server: {
    handlers: {
      POST: async () => qbittorrentPlainTextResponse('Ok'),
    },
  },
})

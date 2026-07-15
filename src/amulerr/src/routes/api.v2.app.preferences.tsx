import { defaultQbittorrentPreferences } from '#/lib/qbittorrent'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/app/preferences')({
  server: {
    handlers: {
      GET: async () => Response.json(defaultQbittorrentPreferences()),
    },
  },
})

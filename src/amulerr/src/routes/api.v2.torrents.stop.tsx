import { useAmule } from '#/amule'
import { hasTorrentHashInput, resolveTorrentHashes } from '#/lib/torrents'
import { createFileRoute } from '@tanstack/react-router'

// https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#stop-torrents
export const Route = createFileRoute('/api/v2/torrents/stop')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const rawHashes = formData.get('hashes')?.toString()

        if (hasTorrentHashInput(rawHashes)) {
          await useAmule(async (amule) => {
            const hashes = await resolveTorrentHashes(amule, rawHashes)
            for (const hash of hashes) {
              await amule.pauseDownload(hash)
            }
          })
        }

        return new Response('Ok', { status: 200 })
      },
    },
  },
})

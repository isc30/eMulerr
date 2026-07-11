import { useAmule } from '#/amule'
import { hasTorrentHashInput, resolveTorrentHashes } from '#/lib/torrents'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/torrents/setCategory')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const rawHashes = formData.get('hashes')?.toString()
        const categoryTitle = formData.get('category')?.toString()

        if (categoryTitle && hasTorrentHashInput(rawHashes)) {
          await useAmule(async (amule) => {
            const hashes = await resolveTorrentHashes(amule, rawHashes)
            if (!hashes.length) {
              return
            }

            const categories = await amule.getCategories()
            const categoryId = categories.find(
              (c) => c.title === categoryTitle,
            )?.id
            if (!categoryId) {
              throw new Error(`Category ${categoryTitle} not found`)
            }

            for (const hash of hashes) {
              if (!(await amule.setFileCategory(hash, categoryId))) {
                throw new Error(`Failed to set category for torrent ${hash}`)
              }
            }
          })
        }

        return Response.json({})
      },
    },
  },
})

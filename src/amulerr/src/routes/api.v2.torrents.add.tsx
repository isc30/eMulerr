import { useAmule } from '#/amule'
import { fromMagnetLink, sameEd2kHash, toEd2kLink } from '#/lib/links'
import { createFileRoute } from '@tanstack/react-router'

function addError(message: string, status = 400) {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  })
}

export const Route = createFileRoute('/api/v2/torrents/add')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const urls = (formData.get('urls') ?? '').toString().trim()
        const category = (formData.get('category') ?? '').toString().trim()

        // qBittorrent clients also send savepath, paused/stopped, ratioLimit, seedingTimeLimit,
        // sequentialDownload, firstLastPiecePrio, contentLayout — all ignored (no aMule equivalent).

        if (!urls) {
          return addError('Missing urls parameter')
        }

        if (!category) {
          return addError('Missing category parameter')
        }

        let hash: string
        let name: string
        let size: number
        try {
          ;({ hash, name, size } = fromMagnetLink(urls))
        } catch {
          return addError('Invalid magnet link')
        }

        const ed2kLink = toEd2kLink(hash, name, size)

        const addResult = await useAmule(async (amule) => {
          const isPresent = async () => {
            const downloads = await amule.getDownloadQueue()
            const shared = await amule.getSharedFiles()
            return [...downloads, ...shared].some((f) =>
              sameEd2kHash(f.fileHash, hash),
            )
          }

          // Idempotent like qBittorrent: aMule rejects duplicates, which clients read as a failed add.
          if (await isPresent()) {
            return { ok: true as const }
          }

          const categories = await amule.getCategories()
          const categoryId = categories.find((c) => c.title === category)?.id
          if (!categoryId) {
            return {
              ok: false as const,
              error: `Category ${category} not found`,
              status: 404,
            }
          }

          if (
            !(await amule.addEd2kLink(ed2kLink, categoryId)) &&
            !(await isPresent())
          ) {
            return {
              ok: false as const,
              error: `Failed to add torrent`,
              status: 500,
            }
          }

          return { ok: true as const }
        })

        if (!addResult.ok) {
          return addError(addResult.error, addResult.status)
        }

        return Response.json({})
      },
    },
  },
})

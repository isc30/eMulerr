import { useAmule } from '#/amule'
import { skipFalsy } from '#/lib/array'
import {
  ed2kHashSet,
  hasTorrentHashInput,
  normalizeEd2kHash,
  resolveTorrentHashes,
} from '#/lib/torrents'
import { createFileRoute } from '@tanstack/react-router'
import fs from 'node:fs/promises'
import path from 'node:path'

export const Route = createFileRoute('/api/v2/torrents/delete')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const rawHashes = formData.get('hashes')?.toString()

        const deleteFilesQsp = formData.get('deleteFiles')?.toString()
        const deleteFiles =
          !deleteFilesQsp || deleteFilesQsp.toLowerCase() === 'true'

        if (hasTorrentHashInput(rawHashes)) {
          await useAmule(async (amule) => {
            const allHashes = rawHashes?.trim().toLowerCase() === 'all'
            const hashes = await resolveTorrentHashes(amule, rawHashes)
            if (!hashes.length && !allHashes) {
              return
            }

            const shared = await amule.getSharedFiles()
            const hashSet = ed2kHashSet(hashes)
            const matches = shared.filter((f) => {
              if (allHashes) {
                return true
              }
              const normalized = normalizeEd2kHash(f.fileHash)
              return normalized !== null && hashSet.has(normalized)
            })

            const ecids = matches.map((f) => f.ecid).filter(skipFalsy)
            await amule.clearCompleted(ecids)
            for (const hash of hashes) {
              await amule.cancelDownload(hash)
            }

            if (deleteFiles) {
              const files = matches
                .filter((f) => f.path && f.fileName)
                .map((f) => path.join(f.path!, f.fileName!))

              await Promise.allSettled(
                files.map((f) =>
                  fs.rm(f, { force: true }).catch((err) => {
                    console.error(`Failed to delete file ${f}:`, err)
                    return Promise.reject(err)
                  }),
                ),
              )

              await amule.refreshSharedFiles()
            }
          })
        }

        return Response.json({})
      },
    },
  },
})

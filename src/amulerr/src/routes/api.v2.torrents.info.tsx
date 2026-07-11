import { useAmule } from '#/amule'
import type { DownloadItem } from '#/amule-ec-node/AmuleClient.mjs'
import { normalizeEd2kHash, toQbittorrentHash } from '#/lib/links'
import {
  clampProgress,
  qbittorrentTorrentExtras,
  torrentAmountLeft,
  torrentEta,
} from '#/lib/qbittorrent'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/torrents/info')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const categoryTitle = url.searchParams.get('category')

        const { categories, shared, downloads } = await useAmule(
          async (amule) => {
            const categories = await amule.getCategories()
            const downloads = await amule.getDownloadQueue()
            const shared = await amule.getSharedFiles()

            const downloadHashes = new Set(
              downloads.flatMap((d) => {
                const normalized = normalizeEd2kHash(d.fileHash)
                return normalized ? [normalized] : []
              }),
            )

            return {
              categories,
              downloads: downloads
                .filter((d) => !!normalizeEd2kHash(d.fileHash))
                .map((d) => ({
                  ...d,
                  category_obj: categories.find((c) => c.id === d.category),
                })),
              shared: shared
                .filter((s) => {
                  const normalized = normalizeEd2kHash(s.fileHash)
                  return normalized !== null && !downloadHashes.has(normalized)
                })
                .map((d) => ({
                  ...d,
                  category_obj: categories.find((c) => c.path === d.path),
                })),
            }
          },
        )

        const filterCategory = categories.find((c) => c.title === categoryTitle)
        if (categoryTitle && !filterCategory) {
          return Response.json([])
        }

        const filteredDownloads = categoryTitle
          ? downloads.filter((d) => d.category_obj === filterCategory)
          : downloads

        const filteredShared = categoryTitle
          ? shared.filter((s) => s.category_obj === filterCategory)
          : shared

        // qBittorrent structure
        return Response.json([
          ...filteredDownloads.map((f) => {
            const savePath = f.category_obj?.path ?? ''
            const fileName = f.fileName ?? ''
            const fileSize = f.fileSize ?? 0
            const fileSizeDownloaded = f.fileSizeDownloaded ?? 0
            const speed = f.speed ?? 0
            const amountLeft = torrentAmountLeft(fileSize, fileSizeDownloaded)
            const progress = clampProgress(f.progress)
            const now = Math.floor(Date.now() / 1000)
            return {
              hash: toQbittorrentHash(f.fileHash),
              name: fileName,
              size: fileSize,
              tracker: 'http://amulerr',
              downloaded: fileSizeDownloaded,
              progress,
              dlspeed: speed,
              eta: torrentEta(speed, amountLeft),
              state: statusToQbittorrentState(f),
              content_path: savePath ? `${savePath}/${fileName}` : fileName,
              save_path: savePath,
              category: f.category_obj?.title ?? '',
              amount_left: amountLeft,
              num_complete: f.sourceCount ?? 0,
              num_incomplete: f.sourceCountNotCurrent ?? 0,
              num_leechs: f.sourceCountXfer ?? 0,
              num_seeds: f.sourceCountA4AF ?? 0,
              seen_complete: f.lastSeenComplete ?? 0,
              last_activity: f.lastReceived ?? 0,
              time_active: f.downloadActiveTime ?? 0,
              added_on: now - (f.downloadActiveTime ?? 0),
              ...qbittorrentTorrentExtras(),
            }
          }),
          ...filteredShared.map((f) => {
            const savePath = f.path ?? ''
            const fileName = f.fileName ?? ''
            return {
              hash: toQbittorrentHash(f.fileHash ?? ''),
              name: fileName,
              size: f.fileSize ?? 0,
              tracker: 'http://amulerr',
              downloaded: f.fileSize ?? 0,
              progress: 1,
              dlspeed: 0,
              state: 'pausedUP' as const,
              content_path: savePath ? `${savePath}/${fileName}` : fileName,
              save_path: savePath,
              category: f.category_obj?.title ?? '',
              ...qbittorrentTorrentExtras(),
            }
          }),
        ])
      },
    },
  },
})

function statusToQbittorrentState(f: DownloadItem) {
  switch (f.status) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 10:
      return f.sourceCountXfer && f.sourceCountXfer > 0
        ? ('downloading' as const)
        : f.progress && parseFloat(f.progress) < 100
          ? ('stalledDL' as const)
          : ('pausedUP' as const)
    case 4:
    case 5:
    case 6:
      return 'error' as const
    case 7:
      return 'pausedDL' as const
    case 8:
      return 'moving' as const
    case 9:
      return 'pausedUP' as const
    default:
      return 'stalledDL' as const
  }
}

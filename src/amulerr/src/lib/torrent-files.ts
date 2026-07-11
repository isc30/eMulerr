import { useAmule } from '#/amule'
import { sameEd2kHash } from '#/lib/links'
import { parseTorrentHash } from '#/lib/torrents'

export type TorrentFileEntry = {
  index: number
  name: string
  size: number
  progress: number
  priority: number
  is_seed: boolean
  availability: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function downloadProgress(fileSize: number, fileSizeDownloaded: number) {
  if (fileSize <= 0) {
    return 0
  }
  return clamp(fileSizeDownloaded / fileSize, 0, 1)
}

function isFullyDownloaded(fileSize: number, fileSizeDownloaded: number) {
  return fileSize > 0 && fileSizeDownloaded >= fileSize
}

export function toDownloadFileEntry(download: {
  fileName?: string
  fileSize?: number
  fileSizeDownloaded?: number
}): TorrentFileEntry {
  const name = download.fileName ?? ''
  const size = download.fileSize ?? 0
  const downloaded = download.fileSizeDownloaded ?? 0
  const progress = downloadProgress(size, downloaded)

  return {
    index: 0,
    name,
    size,
    progress,
    priority: 1,
    is_seed: isFullyDownloaded(size, downloaded),
    availability: 1,
  }
}

export function toSharedFileEntry(sharedFile: {
  fileName?: string
  fileSize?: number
}): TorrentFileEntry {
  const name = sharedFile.fileName ?? ''
  const size = sharedFile.fileSize ?? 0

  return {
    index: 0,
    name,
    size,
    progress: 1,
    priority: 1,
    is_seed: true,
    availability: 1,
  }
}

export async function extractTorrentHash(
  request: Request,
): Promise<string | null> {
  const fromQuery = new URL(request.url).searchParams.get('hash')

  if (request.method === 'GET') {
    return fromQuery
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (
    contentType.includes('multipart/form-data') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    const formData = await request.formData()
    const fromBody = (formData.get('hash') ?? '').toString().trim()
    return fromBody || fromQuery
  }

  return fromQuery
}

export async function getTorrentFilesResponse(
  rawHash: string | null | undefined,
): Promise<Response> {
  if (!rawHash) {
    return Response.json([], { status: 404 })
  }

  const hash = parseTorrentHash(rawHash)
  if (!hash) {
    return Response.json([], { status: 404 })
  }

  const file = await useAmule(async (amule) => {
    const downloads = await amule.getDownloadQueue()
    const shared = await amule.getSharedFiles()

    const download = downloads.find((item) => sameEd2kHash(item.fileHash, hash))
    if (download) {
      return toDownloadFileEntry(download)
    }

    const sharedFile = shared.find((item) => sameEd2kHash(item.fileHash, hash))
    if (sharedFile) {
      return toSharedFileEntry(sharedFile)
    }

    return null
  })

  if (!file) {
    return Response.json([], { status: 404 })
  }

  return Response.json([file])
}

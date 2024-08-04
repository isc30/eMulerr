import {
  amuleGetUploads,
  amuleGetDownloads,
  amuleGetShared,
  amuleDoDownload,
  amuleDoDelete,
  amuleDoReloadShared,
} from "amule/amule"
import { toEd2kLink } from "~/links"
import { unlink } from "node:fs/promises"
import { createJsonDb } from "~/utils/jsonDb"
import { staleWhileRevalidate } from "~/utils/memoize"

export const metadataDb = createJsonDb<
  Record<string, { category: string; addedOn: number }>
>("/config/hash-metadata.json", {})

export const getDownloadClientFiles = staleWhileRevalidate(async function () {
  const uploads = await amuleGetUploads()
  const downloads = await amuleGetDownloads()
  const shared = (await amuleGetShared())
    .filter(
      (f) => !downloads.some((d) => d.hash === f.hash)
    )
    .map(
      (f) =>
        ({
          ...f,
          eta: 0,
          last_seen_complete: 0,
          prio: 0,
          prio_auto: 0,
          progress: 1,
          size_done: f.size,
          size_xfer: 0,
          src_valid: null,
          src_count: null,
          src_count_xfer: null,
          speed: null,
          status: 9,
          status_str: "downloaded",
        }) as const
    )

  const metadata = metadataDb.data

  const files = [
    ...downloads.sort(
      (a, b) =>
        (b.speed > 0 ? 1 : 0) - (a.speed > 0 ? 1 : 0) ||
        b.progress - a.progress ||
        b.speed - a.speed
    ),
    ...shared,
  ].map((f) => ({
    ...f,
    up_speed: uploads
      .filter((u) => u.name === f.name)
      .map((u) => u.xfer_speed)
      .reduce((prev, curr) => prev + curr, 0),
    meta: metadata[f.hash],
  }))

  return files
})

export async function download(
  hash: string,
  name: string,
  size: number,
  category: string
) {
  const ed2kLink = toEd2kLink(hash, name, size)
  await amuleDoDownload(ed2kLink)

  metadataDb.data[hash] = {
    category,
    addedOn: Date.now(),
  }
}

export function setCategory(hash: string, category: string) {
  let entry = metadataDb.data[hash]
  if (!entry) {
    entry = metadataDb.data[hash] = {
      addedOn: Date.now(),
      category: category,
    }
  }

  entry.category = category
}

export async function remove(hashes: string[]) {
  if (hashes.length) {
    const downloads = await amuleGetDownloads()
    const shared = await amuleGetShared()

    await Promise.all(
      hashes.map(async (hash) => {
        const file =
          downloads.find((v) => v.hash === hash) ??
          shared.find((v) => v.hash === hash)

        await amuleDoDelete(hash)

        if (file) {
          await unlink(`/downloads/complete/${file.name}`).catch(() => void 0)
          await unlink(`/tmp/shared/${file.name}`).catch(() => void 0)
        }

        delete metadataDb.data[hash]
      })
    )

    await amuleDoReloadShared()
  }
}

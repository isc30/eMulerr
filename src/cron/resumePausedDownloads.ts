import { amuleDoResume, amuleGetDownloads } from "amule/amule"
import { Mutex } from "async-mutex"
import { logger } from "~/utils/logger"

declare global {
    var resumePausedDownloadsMutex: Mutex
}

globalThis.resumePausedDownloadsMutex = new Mutex()

export async function resumePausedDownloads() {
    if (globalThis.resumePausedDownloadsMutex.isLocked()) {
        return
    }

    await globalThis.resumePausedDownloadsMutex.runExclusive(async () => {
        const downloads = await amuleGetDownloads()
        const stoppedDownloads = downloads.filter(d => d.status_str === 'stopped')
        logger.info('[resumePausedDownloads] Resuming', stoppedDownloads.length, 'downloads')
        await Promise.all(stoppedDownloads.map(d => amuleDoResume(d.hash)))
    })
}

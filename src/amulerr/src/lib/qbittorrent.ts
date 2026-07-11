export const QBITTORRENT_WEBAPI_VERSION = '2.11.0'
export const QBITTORRENT_APP_VERSION = 'v4.6.7'

/** qBittorrent returns 8640000 s (100 days) when download speed is zero and ETA is unknown. */
export const QBITTORRENT_UNKNOWN_ETA_SECONDS = 8640000

export function qbittorrentPlainTextResponse(
  body: string,
  cacheControl = 'public, max-age=0',
) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': cacheControl,
    },
  })
}

/** Safe defaults for *rr / LazyLibrarian preference polling (ratio/seeding limits disabled). */
export function defaultQbittorrentPreferences() {
  return {
    save_path: '/downloads/complete',
    temp_path_enabled: false,
    temp_path: '/downloads/incomplete',
    create_subfolder_enabled: false,
    max_ratio_enabled: false,
    max_ratio: -1,
    max_seeding_time_enabled: false,
    max_seeding_time: -1,
  }
}

/** Extra qBittorrent torrent list fields expected by Sonarr/Radarr/LazyLibrarian/PyMedusa. */
export function qbittorrentTorrentExtras(
  options: {
    completionOn?: number
  } = {},
) {
  return {
    ratio: 0,
    max_ratio: -1,
    seeding_time: 0,
    completion_on: options.completionOn ?? -1,
    uploaded: 0,
    upspeed: 0,
  }
}

/** aMule progress is 0..100; qBittorrent torrent list uses a 0..1 fraction. */
export function clampProgress(
  rawProgress: string | number | undefined,
): number {
  if (rawProgress === undefined || rawProgress === '') {
    return 0
  }

  const percent =
    typeof rawProgress === 'number' ? rawProgress : parseFloat(rawProgress)
  if (!Number.isFinite(percent) || percent < 0) {
    return 0
  }
  if (percent >= 100) {
    return 1
  }
  return percent / 100
}

export function torrentAmountLeft(
  fileSize: number,
  fileSizeDownloaded: number,
) {
  return Math.max(0, fileSize - fileSizeDownloaded)
}

export function torrentEta(dlspeed: number, amountLeft: number) {
  if (amountLeft <= 0) {
    return 0
  }
  if (dlspeed > 0) {
    return Math.ceil(amountLeft / dlspeed)
  }
  return QBITTORRENT_UNKNOWN_ETA_SECONDS
}

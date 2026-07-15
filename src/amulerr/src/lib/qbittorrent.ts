export const QBITTORRENT_WEBAPI_VERSION = '2.11.0'
export const QBITTORRENT_APP_VERSION = 'v4.6.7'

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

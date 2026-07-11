import { afterEach, describe, expect, it, vi } from 'vitest'
import path from 'node:path'
import {
  clampProgress,
  defaultQbittorrentPreferences,
  QBITTORRENT_UNKNOWN_ETA_SECONDS,
  QBITTORRENT_WEBAPI_VERSION,
  qbittorrentTorrentExtras,
  torrentAmountLeft,
  torrentEta,
} from './qbittorrent'

vi.mock('#/amule', () => ({
  useAmule: vi.fn(async (fn: (client: unknown) => Promise<unknown>) =>
    fn({
      getDownloadQueue: async () => [],
      getSharedFiles: async () => [],
      getCategories: async () => [],
    }),
  ),
}))

vi.mock('node:fs/promises', () => ({
  default: {
    rm: vi.fn(async () => undefined),
  },
}))

afterEach(async () => {
  vi.clearAllMocks()
  const { useAmule } = await import('#/amule')
  vi.mocked(useAmule).mockImplementation(async (fn) =>
    fn({
      getDownloadQueue: async () => [],
      getSharedFiles: async () => [],
      getCategories: async () => [],
    }),
  )
})

type RouteHandler = (ctx: { request: Request }) => Promise<Response>

function getHandler(
  route: {
    options?: {
      server?: { handlers?: { GET?: RouteHandler; POST?: RouteHandler } }
    }
  },
  method: 'GET' | 'POST' = 'GET',
) {
  const handler = route.options?.server?.handlers?.[method]
  if (!handler) {
    throw new Error(`Missing ${method} handler`)
  }
  return handler
}

describe('qbittorrent lib', () => {
  it('returns safe preference defaults', () => {
    const prefs = defaultQbittorrentPreferences()
    expect(prefs.max_ratio_enabled).toBe(false)
    expect(prefs.max_ratio).toBe(-1)
    expect(prefs.max_seeding_time_enabled).toBe(false)
    expect(prefs.max_seeding_time).toBe(-1)
  })

  it('adds stable torrent list extras', () => {
    expect(qbittorrentTorrentExtras()).toEqual({
      ratio: 0,
      max_ratio: -1,
      seeding_time: 0,
      completion_on: -1,
      uploaded: 0,
      upspeed: 0,
    })
    expect(
      qbittorrentTorrentExtras({ completionOn: 1700000000 }).completion_on,
    ).toBe(1700000000)
  })

  it('clampProgress maps aMule percent to qBittorrent 0..1 fraction', () => {
    expect(clampProgress(undefined)).toBe(0)
    expect(clampProgress('50')).toBe(0.5)
    expect(clampProgress(50)).toBe(0.5)
    expect(clampProgress('100')).toBe(1)
    expect(clampProgress(100)).toBe(1)
    expect(clampProgress('150')).toBe(1)
    expect(clampProgress(-5)).toBe(0)
  })

  it('torrentAmountLeft never returns negative values', () => {
    expect(torrentAmountLeft(100, 50)).toBe(50)
    expect(torrentAmountLeft(100, 150)).toBe(0)
  })

  it('torrentEta returns integer seconds for qBittorrent compatibility', () => {
    expect(torrentEta(10, 50)).toBe(5)
    expect(torrentEta(10, 0)).toBe(0)
    expect(torrentEta(0, 50)).toBe(QBITTORRENT_UNKNOWN_ETA_SECONDS)
    expect(torrentEta(3, 50)).toBe(17)
    expect(Number.isInteger(torrentEta(3, 50))).toBe(true)
  })
})

describe('app routes', () => {
  it('/api/v2/app/webapiVersion returns text/plain semver', async () => {
    const { Route } = await import('#/routes/api.v2.app.webapiVersion')
    const response = await getHandler(Route)({
      request: new Request('http://x/api/v2/app/webapiVersion'),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/plain')
    expect(await response.text()).toBe(QBITTORRENT_WEBAPI_VERSION)
  })

  it('/api/v2/app/version returns qBittorrent-like version text', async () => {
    const { Route } = await import('#/routes/api.v2.app.version')
    const response = await getHandler(Route)({
      request: new Request('http://x/api/v2/app/version'),
    })
    expect(response.headers.get('Content-Type')).toBe('text/plain')
    expect(await response.text()).toMatch(/^v/)
  })

  it('/api/v2/app/preferences returns required JSON fields', async () => {
    const { Route } = await import('#/routes/api.v2.app.preferences')
    const response = await getHandler(Route)({
      request: new Request('http://x/api/v2/app/preferences'),
    })
    const body = await response.json()
    expect(body.max_ratio_enabled).toBe(false)
    expect(body.max_seeding_time).toBe(-1)
  })

  it('/api/v2/auth/login returns Ok. and SID cookie', async () => {
    const { Route } = await import('#/routes/api.v2.auth.login')
    const response = await getHandler(
      Route,
      'POST',
    )({ request: new Request('http://x') })
    expect(await response.text()).toBe('Ok.')
    expect(response.headers.get('Set-Cookie')).toContain('SID=')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('/api/v2/auth/login adds Secure to SID cookie over HTTPS', async () => {
    const { Route } = await import('#/routes/api.v2.auth.login')
    const response = await getHandler(
      Route,
      'POST',
    )({
      request: new Request('https://x/api/v2/auth/login'),
    })
    expect(response.headers.get('Set-Cookie')).toContain('; Secure')
  })

  it('/api/v2/auth/logout adds Secure when behind HTTPS proxy', async () => {
    const { Route } = await import('#/routes/api.v2.auth.logout')
    const response = await getHandler(
      Route,
      'POST',
    )({
      request: new Request('http://x/api/v2/auth/logout', {
        headers: { 'X-Forwarded-Proto': 'https' },
      }),
    })
    expect(response.headers.get('Set-Cookie')).toContain('; Secure')
  })
})

describe('torrents/properties', () => {
  it('returns 404 for invalid hash without calling aMule', async () => {
    const { useAmule } = await import('#/amule')
    const { Route } = await import('#/routes/api.v2.torrents.properties')
    const request = new Request(
      'http://x/api/v2/torrents/properties?hash=notvalid',
    )
    const response = await getHandler(Route)({ request })
    expect(response.status).toBe(404)
    expect(useAmule).not.toHaveBeenCalled()
  })

  it('returns 404 for missing torrent', async () => {
    const { Route } = await import('#/routes/api.v2.torrents.properties')
    const hash = `${'a'.repeat(32)}00000000`
    const request = new Request(
      `http://x/api/v2/torrents/properties?hash=${hash}`,
    )
    const response = await getHandler(Route)({ request })
    expect(response.status).toBe(404)
  })
})

describe('no-op torrent routes', () => {
  const postRequest = { request: new Request('http://x', { method: 'POST' }) }

  it('setShareLimits returns Ok', async () => {
    const { Route } = await import('#/routes/api.v2.torrents.setShareLimits')
    const response = await getHandler(Route, 'POST')(postRequest)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/plain')
    expect(await response.text()).toBe('Ok')
  })

  it('topPrio returns Ok', async () => {
    const { Route } = await import('#/routes/api.v2.torrents.topPrio')
    const response = await getHandler(Route, 'POST')(postRequest)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/plain')
    expect(await response.text()).toBe('Ok')
  })

  it('setForceStart returns Ok', async () => {
    const { Route } = await import('#/routes/api.v2.torrents.setForceStart')
    const response = await getHandler(Route, 'POST')(postRequest)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/plain')
    expect(await response.text()).toBe('Ok')
  })
})

const ED2K = 'A1B2C3D4E5F60718293A4B5C6D7E8F90'
const BTIH = `${ED2K.toLowerCase()}00000000`

describe('torrents/info', () => {
  async function getInfoTorrent(
    progress: string,
    fileSize = 100,
    fileSizeDownloaded = 50,
    speed = 10,
  ) {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: 'book.pdf',
            fileSize,
            fileSizeDownloaded,
            progress,
            speed,
            status: 3,
          },
        ],
        getSharedFiles: async () => [],
        getCategories: async () => [],
      }),
    )
    const { Route } = await import('#/routes/api.v2.torrents.info')
    const response = await getHandler(Route)({
      request: new Request('http://x/api/v2/torrents/info'),
    })
    expect(response.status).toBe(200)
    return (await response.json())[0]
  }

  it('returns progress 1 when aMule reports 100', async () => {
    const torrent = await getInfoTorrent('100', 100, 100)
    expect(torrent.progress).toBe(1)
  })

  it('returns progress 1 when aMule reports over 100', async () => {
    const torrent = await getInfoTorrent('150', 100, 100)
    expect(torrent.progress).toBe(1)
  })

  it('returns progress 0.5 when aMule reports 50', async () => {
    const torrent = await getInfoTorrent('50', 100, 50)
    expect(torrent.progress).toBe(0.5)
  })

  it('returns amount_left 0 when downloaded exceeds size', async () => {
    const torrent = await getInfoTorrent('100', 100, 150, 10)
    expect(torrent.amount_left).toBe(0)
  })

  it('returns non-negative eta when downloaded exceeds size', async () => {
    const torrent = await getInfoTorrent('100', 100, 150, 10)
    expect(torrent.eta).toBeGreaterThanOrEqual(0)
    expect(torrent.eta).toBe(0)
  })

  it('returns completion_on -1 for finished downloads and shared files', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: 'done.pdf',
            fileSize: 100,
            fileSizeDownloaded: 100,
            progress: '100',
            speed: 0,
            status: 9,
          },
        ],
        getSharedFiles: async () => [
          {
            fileHash: 'B1B2C3D4E5F60718293A4B5C6D7E8F91',
            fileName: 'shared.pdf',
            fileSize: 42,
            path: '/shared',
          },
        ],
        getCategories: async () => [],
      }),
    )
    const { Route } = await import('#/routes/api.v2.torrents.info')
    const response = await getHandler(Route)({
      request: new Request('http://x/api/v2/torrents/info'),
    })
    const body = await response.json()
    expect(body[0].completion_on).toBe(-1)
    expect(body[1].completion_on).toBe(-1)
  })

  it('returns stable completion_on across repeated info polls', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockImplementation(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: 'done.pdf',
            fileSize: 100,
            fileSizeDownloaded: 100,
            progress: '100',
            speed: 0,
            status: 9,
          },
        ],
        getSharedFiles: async () => [],
        getCategories: async () => [],
      }),
    )
    const { Route } = await import('#/routes/api.v2.torrents.info')
    const handler = getHandler(Route)
    const request = { request: new Request('http://x/api/v2/torrents/info') }
    const first = await (await handler(request)).json()
    const second = await (await handler(request)).json()
    expect(first[0].completion_on).toBe(-1)
    expect(second[0].completion_on).toBe(-1)
    expect(first[0].completion_on).toBe(second[0].completion_on)
  })

  it('leaves completion_on at -1 for in-progress downloads', async () => {
    const torrent = await getInfoTorrent('50', 100, 50)
    expect(torrent.completion_on).toBe(-1)
  })

  it('deduplicates shared files against downloads case-insensitively', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: 'downloading.pdf',
            fileSize: 100,
            fileSizeDownloaded: 50,
            progress: '50',
            speed: 10,
            status: 3,
          },
        ],
        getSharedFiles: async () => [
          {
            fileHash: ED2K.toLowerCase(),
            fileName: 'shared-same-hash.pdf',
            fileSize: 100,
            path: '/shared',
          },
        ],
        getCategories: async () => [],
      }),
    )
    const { Route } = await import('#/routes/api.v2.torrents.info')
    const response = await getHandler(Route)({
      request: new Request('http://x/api/v2/torrents/info'),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('downloading.pdf')
  })

  it('returns empty array for unknown category filter', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: 'book.pdf',
            fileSize: 100,
            fileSizeDownloaded: 50,
            progress: '50',
            speed: 10,
            status: 3,
            category: 1,
          },
        ],
        getSharedFiles: async () => [],
        getCategories: async () => [{ id: 1, title: 'books', path: '/books' }],
      }),
    )
    const { Route } = await import('#/routes/api.v2.torrents.info')
    const response = await getHandler(Route)({
      request: new Request('http://x/api/v2/torrents/info?category=missing'),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([])
  })
})

describe('torrents/files and torrents/contents', () => {
  it('GET /torrents/files returns 404 for invalid hash without aMule', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockClear()
    const { Route } = await import('#/routes/api.v2.torrents.files')
    const response = await getHandler(Route)({
      request: new Request('http://x/api/v2/torrents/files?hash=bad'),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual([])
    expect(useAmule).not.toHaveBeenCalled()
  })

  it('GET /torrents/files returns partial download with 0..1 progress and is_seed false', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: 'book.pdf',
            fileSize: 100,
            fileSizeDownloaded: 50,
          },
        ],
        getSharedFiles: async () => [],
      }),
    )
    const { Route } = await import('#/routes/api.v2.torrents.files')
    const response = await getHandler(Route)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([
      {
        index: 0,
        name: 'book.pdf',
        size: 100,
        progress: 0.5,
        priority: 1,
        is_seed: false,
        availability: 1,
      },
    ])
    expect(body[0].progress).toBeGreaterThanOrEqual(0)
    expect(body[0].progress).toBeLessThanOrEqual(1)
  })

  it('GET /torrents/files defaults missing name/size and uses zero progress', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [{ fileHash: ED2K }],
        getSharedFiles: async () => [],
      }),
    )
    const { Route } = await import('#/routes/api.v2.torrents.files')
    const response = await getHandler(Route)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        index: 0,
        name: '',
        size: 0,
        progress: 0,
        priority: 1,
        is_seed: false,
        availability: 1,
      },
    ])
  })

  it('GET /torrents/files returns completed download with progress 1 and is_seed true', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: 'book.pdf',
            fileSize: 100,
            fileSizeDownloaded: 100,
          },
        ],
        getSharedFiles: async () => [],
      }),
    )
    const { Route } = await import('#/routes/api.v2.torrents.files')
    const response = await getHandler(Route)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        index: 0,
        name: 'book.pdf',
        size: 100,
        progress: 1,
        priority: 1,
        is_seed: true,
        availability: 1,
      },
    ])
  })

  it('GET /torrents/files returns shared file with progress 1 and is_seed true', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [],
        getSharedFiles: async () => [
          {
            fileHash: ED2K,
            fileName: 'shared.pdf',
            fileSize: 42,
          },
        ],
      }),
    )
    const { Route } = await import('#/routes/api.v2.torrents.files')
    const response = await getHandler(Route)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        index: 0,
        name: 'shared.pdf',
        size: 42,
        progress: 1,
        priority: 1,
        is_seed: true,
        availability: 1,
      },
    ])
  })

  it('POST /torrents/contents mirrors GET /torrents/files for the same hash', async () => {
    const { useAmule } = await import('#/amule')
    const amuleData = {
      getDownloadQueue: async () => [
        {
          fileHash: ED2K,
          fileName: 'book.pdf',
          fileSize: 100,
          fileSizeDownloaded: 25,
        },
      ],
      getSharedFiles: async () => [],
    }
    vi.mocked(useAmule)
      .mockImplementationOnce(async (fn) => fn(amuleData))
      .mockImplementationOnce(async (fn) => fn(amuleData))

    const { Route: filesRoute } = await import('#/routes/api.v2.torrents.files')
    const filesResponse = await getHandler(filesRoute)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })

    const { Route: contentsRoute } =
      await import('#/routes/api.v2.torrents.contents')
    const contentsResponse = await getHandler(
      contentsRoute,
      'POST',
    )({
      request: new Request('http://x/api/v2/torrents/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ hash: BTIH }),
      }),
    })

    expect(filesResponse.status).toBe(200)
    expect(contentsResponse.status).toBe(200)
    expect(await contentsResponse.json()).toEqual(await filesResponse.json())
  })

  it('POST /torrents/contents falls back to query hash when body hash is empty', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [
          {
            fileHash: ED2K,
            fileName: 'book.pdf',
            fileSize: 100,
            fileSizeDownloaded: 50,
          },
        ],
        getSharedFiles: async () => [],
      }),
    )
    const { Route } = await import('#/routes/api.v2.torrents.contents')
    const response = await getHandler(
      Route,
      'POST',
    )({
      request: new Request(`http://x/api/v2/torrents/contents?hash=${BTIH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ hash: '' }),
      }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        index: 0,
        name: 'book.pdf',
        size: 100,
        progress: 0.5,
        priority: 1,
        is_seed: false,
        availability: 1,
      },
    ])
  })

  it('POST /torrents/contents returns 404 for invalid hash', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockClear()
    const { Route } = await import('#/routes/api.v2.torrents.contents')
    const body = new URLSearchParams({ hash: 'not-a-hash' })
    const response = await getHandler(
      Route,
      'POST',
    )({
      request: new Request('http://x/api/v2/torrents/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      }),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual([])
    expect(useAmule).not.toHaveBeenCalled()
  })

  it('POST /torrents/contents returns 404 for unknown hash', async () => {
    const { Route } = await import('#/routes/api.v2.torrents.contents')
    const body = new URLSearchParams({ hash: BTIH })
    const response = await getHandler(
      Route,
      'POST',
    )({
      request: new Request('http://x/api/v2/torrents/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      }),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual([])
  })

  it('GET /torrents/files returns 404 for unknown hash', async () => {
    const { Route } = await import('#/routes/api.v2.torrents.files')
    const response = await getHandler(Route)({
      request: new Request(`http://x/api/v2/torrents/files?hash=${BTIH}`),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual([])
  })
})

describe('torrents/add', () => {
  const magnet = `magnet:?xt=urn:btih:${BTIH}&dn=${encodeURIComponent('book.pdf')}&xl=100&tr=http://amulerr`

  async function postAdd(form: Record<string, string>) {
    const { Route } = await import('#/routes/api.v2.torrents.add')
    return getHandler(
      Route,
      'POST',
    )({
      request: new Request('http://x/api/v2/torrents/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(form),
      }),
    })
  }

  it('returns 400 when urls is missing', async () => {
    const { useAmule } = await import('#/amule')
    const response = await postAdd({ category: 'books' })
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Missing urls parameter')
    expect(useAmule).not.toHaveBeenCalled()
  })

  it('returns 400 when category is missing or blank', async () => {
    const { useAmule } = await import('#/amule')
    const missing = await postAdd({ urls: magnet })
    expect(missing.status).toBe(400)
    expect(await missing.text()).toBe('Missing category parameter')

    const blank = await postAdd({ urls: magnet, category: '   ' })
    expect(blank.status).toBe(400)
    expect(await blank.text()).toBe('Missing category parameter')
    expect(useAmule).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid magnet links', async () => {
    const { useAmule } = await import('#/amule')
    const response = await postAdd({ urls: 'not-a-magnet', category: 'books' })
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Invalid magnet link')
    expect(useAmule).not.toHaveBeenCalled()
  })

  it('returns 404 for unknown category', async () => {
    const { useAmule } = await import('#/amule')
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [],
        getSharedFiles: async () => [],
        getCategories: async () => [{ id: 1, title: 'books', path: '/books' }],
        addEd2kLink: vi.fn(async () => true),
      }),
    )
    const response = await postAdd({ urls: magnet, category: 'missing' })
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Category missing not found')
  })

  it('returns 200 when torrent is already present', async () => {
    const { useAmule } = await import('#/amule')
    const addEd2kLink = vi.fn(async () => true)
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [{ fileHash: ED2K }],
        getSharedFiles: async () => [],
        getCategories: async () => [{ id: 1, title: 'books', path: '/books' }],
        addEd2kLink,
      }),
    )
    const response = await postAdd({ urls: magnet, category: 'books' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({})
    expect(addEd2kLink).not.toHaveBeenCalled()
  })

  it('treats failed add as success when torrent appears after re-check', async () => {
    const { useAmule } = await import('#/amule')
    let present = false
    const addEd2kLink = vi.fn(async () => {
      present = true
      return false
    })
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => (present ? [{ fileHash: ED2K }] : []),
        getSharedFiles: async () => [],
        getCategories: async () => [{ id: 1, title: 'books', path: '/books' }],
        addEd2kLink,
      }),
    )
    const response = await postAdd({ urls: magnet, category: 'books' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({})
    expect(addEd2kLink).toHaveBeenCalledOnce()
  })
})

const OTHER_ED2K = 'B1B2C3D4E5F60718293A4B5C6D7E8F91'

describe('torrents/delete', () => {
  async function postDelete(
    hashes: string,
    options?: { deleteFiles?: string },
  ) {
    const params = new URLSearchParams({ hashes })
    if (options?.deleteFiles !== undefined) {
      params.set('deleteFiles', options.deleteFiles)
    }

    const { Route } = await import('#/routes/api.v2.torrents.delete')
    return getHandler(
      Route,
      'POST',
    )({
      request: new Request('http://x/api/v2/torrents/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      }),
    })
  }

  const sharedWithPaths = [
    {
      ecid: 101,
      fileHash: ED2K.toLowerCase(),
      path: '/downloads',
      fileName: 'book.epub',
    },
    {
      ecid: 202,
      fileHash: OTHER_ED2K,
      path: '/downloads',
      fileName: 'other.epub',
    },
  ]

  it('clears all shared ecids when hashes=all', async () => {
    const { useAmule } = await import('#/amule')
    const clearCompleted = vi.fn(async () => true)
    const cancelDownload = vi.fn(async () => true)
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [{ fileHash: ED2K }],
        getSharedFiles: async () => [
          { ecid: 101, fileHash: ED2K },
          { ecid: 202, fileHash: OTHER_ED2K },
        ],
        clearCompleted,
        cancelDownload,
      }),
    )

    const response = await postDelete('all', { deleteFiles: 'false' })
    expect(response.status).toBe(200)
    expect(clearCompleted).toHaveBeenCalledWith([101, 202])
    expect(cancelDownload).toHaveBeenCalledWith(ED2K)
  })

  it('clears only the matching shared ecid for a specific hash', async () => {
    const { useAmule } = await import('#/amule')
    const clearCompleted = vi.fn(async () => true)
    const cancelDownload = vi.fn(async () => true)
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [],
        getSharedFiles: async () => [
          { ecid: 101, fileHash: ED2K.toLowerCase() },
          { ecid: 202, fileHash: OTHER_ED2K },
        ],
        clearCompleted,
        cancelDownload,
      }),
    )

    const response = await postDelete(BTIH, { deleteFiles: 'false' })
    expect(response.status).toBe(200)
    expect(clearCompleted).toHaveBeenCalledWith([101])
    expect(cancelDownload).toHaveBeenCalledWith(ED2K)
  })

  it('does not delete files or refresh shared files when deleteFiles=false', async () => {
    const fs = await import('node:fs/promises')
    const { useAmule } = await import('#/amule')
    const clearCompleted = vi.fn(async () => true)
    const cancelDownload = vi.fn(async () => true)
    const refreshSharedFiles = vi.fn(async () => true)
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [],
        getSharedFiles: async () => sharedWithPaths,
        clearCompleted,
        cancelDownload,
        refreshSharedFiles,
      }),
    )

    const response = await postDelete(BTIH, { deleteFiles: 'false' })
    expect(response.status).toBe(200)
    expect(vi.mocked(fs.default.rm)).not.toHaveBeenCalled()
    expect(refreshSharedFiles).not.toHaveBeenCalled()
  })

  it('deletes matching files and refreshes shared files when deleteFiles=true', async () => {
    const fs = await import('node:fs/promises')
    const { useAmule } = await import('#/amule')
    const clearCompleted = vi.fn(async () => true)
    const cancelDownload = vi.fn(async () => true)
    const refreshSharedFiles = vi.fn(async () => true)
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [],
        getSharedFiles: async () => sharedWithPaths,
        clearCompleted,
        cancelDownload,
        refreshSharedFiles,
      }),
    )

    const response = await postDelete(BTIH, { deleteFiles: 'true' })
    expect(response.status).toBe(200)
    expect(vi.mocked(fs.default.rm)).toHaveBeenCalledOnce()
    expect(vi.mocked(fs.default.rm)).toHaveBeenCalledWith(
      path.join('/downloads', 'book.epub'),
      { force: true },
    )
    expect(refreshSharedFiles).toHaveBeenCalledOnce()
  })

  it('deletes files by default when deleteFiles is omitted', async () => {
    const fs = await import('node:fs/promises')
    const { useAmule } = await import('#/amule')
    const refreshSharedFiles = vi.fn(async () => true)
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [],
        getSharedFiles: async () => sharedWithPaths,
        clearCompleted: vi.fn(async () => true),
        cancelDownload: vi.fn(async () => true),
        refreshSharedFiles,
      }),
    )

    const response = await postDelete(BTIH)
    expect(response.status).toBe(200)
    expect(vi.mocked(fs.default.rm)).toHaveBeenCalledOnce()
    expect(refreshSharedFiles).toHaveBeenCalledOnce()
  })

  it('deletes all shared files when hashes=all and deleteFiles=true', async () => {
    const fs = await import('node:fs/promises')
    const { useAmule } = await import('#/amule')
    const refreshSharedFiles = vi.fn(async () => true)
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [{ fileHash: ED2K }],
        getSharedFiles: async () => sharedWithPaths,
        clearCompleted: vi.fn(async () => true),
        cancelDownload: vi.fn(async () => true),
        refreshSharedFiles,
      }),
    )

    const response = await postDelete('all', { deleteFiles: 'true' })
    expect(response.status).toBe(200)
    expect(vi.mocked(fs.default.rm)).toHaveBeenCalledTimes(2)
    expect(refreshSharedFiles).toHaveBeenCalledOnce()
  })

  it('does not delete files when hashes=all and deleteFiles=false', async () => {
    const fs = await import('node:fs/promises')
    const { useAmule } = await import('#/amule')
    const refreshSharedFiles = vi.fn(async () => true)
    vi.mocked(useAmule).mockImplementationOnce(async (fn) =>
      fn({
        getDownloadQueue: async () => [{ fileHash: ED2K }],
        getSharedFiles: async () => sharedWithPaths,
        clearCompleted: vi.fn(async () => true),
        cancelDownload: vi.fn(async () => true),
        refreshSharedFiles,
      }),
    )

    const response = await postDelete('all', { deleteFiles: 'false' })
    expect(response.status).toBe(200)
    expect(vi.mocked(fs.default.rm)).not.toHaveBeenCalled()
    expect(refreshSharedFiles).not.toHaveBeenCalled()
  })
})

import { describe, expect, it } from 'vitest'
import {
  defaultQbittorrentPreferences,
  QBITTORRENT_APP_VERSION,
  QBITTORRENT_WEBAPI_VERSION,
} from './qbittorrent'

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

describe('qbittorrent app/auth helpers', () => {
  it('returns safe preference defaults', () => {
    const prefs = defaultQbittorrentPreferences()
    expect(prefs.max_ratio_enabled).toBe(false)
    expect(prefs.max_ratio).toBe(-1)
    expect(prefs.max_seeding_time_enabled).toBe(false)
    expect(prefs.max_seeding_time).toBe(-1)
  })
})

describe('app/auth routes', () => {
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
    expect(await response.text()).toBe(QBITTORRENT_APP_VERSION)
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
    )({
      request: new Request('http://x'),
    })
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

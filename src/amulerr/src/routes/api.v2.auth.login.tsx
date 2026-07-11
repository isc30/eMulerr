import { createFileRoute } from '@tanstack/react-router'
import { secureCookieSuffix } from '#/lib/cookies'

// amulerr does not implement authentication. We still return qBittorrent's standard
// response ("Ok." + SID cookie) so that clients requiring the /api/v2/auth/login step
// (Prowlarr, Sonarr, Radarr, Medusa, ...) accept the connection.
const ok = (request: Request) => {
  const secure = secureCookieSuffix(request)
  return new Response(`Ok.`, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'X-Content-Type-Options': 'nosniff',
      'Set-Cookie': `SID=amulerr; HttpOnly; SameSite=Strict; Path=/${secure}`,
      'Cache-Control': 'no-store',
    },
  })
}

export const Route = createFileRoute('/api/v2/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => ok(request),
      GET: async ({ request }) => ok(request),
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'
import { secureCookieSuffix } from '#/lib/cookies'

const ok = (request: Request) => {
  const secure = secureCookieSuffix(request)
  return new Response(`Ok.`, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'X-Content-Type-Options': 'nosniff',
      'Set-Cookie': `SID=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`,
      'Cache-Control': 'no-store',
    },
  })
}

export const Route = createFileRoute('/api/v2/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }) => ok(request),
      GET: async ({ request }) => ok(request),
    },
  },
})

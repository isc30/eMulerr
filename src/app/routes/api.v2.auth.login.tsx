import { ActionFunction } from "@remix-run/node"

export const action = (() =>
  new Response(``, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
      "Set-Cookie": "SID=FAKE; path=/",
    },
  })) satisfies ActionFunction

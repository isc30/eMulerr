import { LoaderFunction } from "@remix-run/node"

export const loader = (() =>
  new Response(`2.8.19`, {
    status: 200,
    headers: {
      "Content-Type": "text",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
    },
  })) satisfies LoaderFunction

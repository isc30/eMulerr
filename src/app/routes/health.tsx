import { LoaderFunction, json } from "@remix-run/node"

export const loader = (async ({ request }) => {
  return json({ ok: 1 })
}) satisfies LoaderFunction

export const action = loader

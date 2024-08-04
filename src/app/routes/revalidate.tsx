import { LoaderFunction } from "@remix-run/node"

export const loader = (async ({ request }) => {
  return null
}) satisfies LoaderFunction

export const action = loader

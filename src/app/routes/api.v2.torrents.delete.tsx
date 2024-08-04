import { ActionFunction, json } from "@remix-run/node"
import { remove } from "~/data/downloadClient"
import { skipFalsy } from "~/utils/array"
import { logger } from "~/utils/logger"

export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const hashes = formData
    .get("hashes")
    ?.toString()
    ?.toUpperCase()
    ?.split("|")
    .filter(skipFalsy)

  if (hashes?.length) {
    await remove(hashes)
  }

  return json({})
}) satisfies ActionFunction

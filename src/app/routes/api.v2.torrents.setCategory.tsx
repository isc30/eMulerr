import { ActionFunction, json } from "@remix-run/node"
import { setCategory } from "~/data/downloadClient"
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
  const category = formData.get("category")?.toString()

  if (category && hashes?.length) {
    await Promise.all(
      hashes.map(async (hash) => {
        return setCategory(hash, category)
      })
    )
  }

  return json({})
}) satisfies ActionFunction

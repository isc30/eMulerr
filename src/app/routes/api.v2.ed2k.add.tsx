import { ActionFunction, json } from "@remix-run/node"
import { download } from "~/data/downloadClient"
import { fromEd2kLink } from "~/links"
import { logger } from "~/utils/logger"

export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const urls = formData.get("urls")?.toString()
  const category = formData.get("category")?.toString()

  if (!urls) {
    throw new Error("No URL to download")
  }

  if (!category) {
    throw new Error("No download category")
  }

  const { hash, name, size } = fromEd2kLink(urls)
  await download(hash, name, size, category)

  return json({})
}) satisfies ActionFunction

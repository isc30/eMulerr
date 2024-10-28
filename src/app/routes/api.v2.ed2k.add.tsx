import { ActionFunction, json } from "@remix-run/node"
import { download } from "~/data/downloadClient"
import { fromEd2kLink } from "~/links"
import { logger } from "~/utils/logger"
import { sanitizeFilename } from "~/utils/naming"

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
  const sanitizedName = sanitizeFilename(name)
  console.log(sanitizedName)
  await download(hash, sanitizedName, size, category)

  return json({})
}) satisfies ActionFunction

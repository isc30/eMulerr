import { ActionFunction, json } from "@remix-run/node"
import { download } from "~/data/downloadClient"
import { fromEd2kLink } from "~/links"
import { logger } from "~/utils/logger"
import { sanitizeFilename } from "~/utils/naming"

export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const category = formData.get("category")?.toString()
  if (!category) {
    throw new Error("No download category")
  }

  const urls = formData.getAll("urls").map(String)
  if (!urls.length) {
    throw new Error("No URL to download")
  }

  const tasks = urls.map(async (url) => {
    const { hash, name, size } = fromEd2kLink(url)
    const sanitizedName = sanitizeFilename(name)
    console.log(sanitizedName)
    await download(hash, sanitizedName, size, category)
  })

  await Promise.all(tasks)
  return json({})
}) satisfies ActionFunction

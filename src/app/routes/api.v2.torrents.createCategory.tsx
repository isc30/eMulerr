import { ActionFunction, json } from "@remix-run/node"
import { createCategory } from "~/data/categories"
import { logger } from "~/utils/logger"

export const action = (async ({ request }) => {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const category = formData.get("category")?.toString()

  if (category) {
    createCategory(category)
  }
  return json({})
}) satisfies ActionFunction

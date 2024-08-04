import { LoaderFunction, json } from "@remix-run/node"
import { getCategories } from "~/data/categories"

export const loader = (async () => {
  const categories = await getCategories()

  return json(
    Object.fromEntries(categories.map((c) => [c, { name: c, savePath: "" }]))
  )
}) satisfies LoaderFunction

export const action = loader

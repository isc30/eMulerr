import { getDownloadClientFiles } from "./downloadClient"
import { skipFalsy } from "~/utils/array"
import { createJsonDb } from "~/utils/jsonDb"

export const categoriesDb = createJsonDb<string[]>(
    "/config/categories.json",
    []
)

export async function getCategories() {
    const downloads = await getDownloadClientFiles()
    return [
        ...new Set(
            [...categoriesDb.data, ...downloads.map((d) => d.meta?.category)].filter(
                skipFalsy
            )
        ),
    ]
}

export function createCategory(category: string) {
    if (!categoriesDb.data.includes(category)) {
        categoriesDb.data.push(category)
    }
}

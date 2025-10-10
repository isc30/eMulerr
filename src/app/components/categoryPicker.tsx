import { useFetcher } from "@remix-run/react"

export function CategoryPicker({
  hash,
  currentCategory,
  allCategories,
}: {
  hash: string
  currentCategory?: string
  allCategories: string[]
}) {
  const fetcher = useFetcher()

  return (
    <fetcher.Form method="POST" action="/api/v2/torrents/setCategory">
      <input type="hidden" name="hashes" value={hash} />
      <select
        className="min-w-min rounded-md border border-neutral-600 bg-neutral-700 px-1 text-white max-sm:text-xs"
        defaultValue={currentCategory ?? "$$null$$"}
        onChange={(ev) => {
          if (ev.target.value === "$$new$$") {
            const cat = prompt("Enter the name of the new category")
            if (!cat) {
              ev.target.value = currentCategory ?? "$$null$$"
              return
            }
            const option = new Option(cat, cat)
            option.hidden = true
            ev.target.options.add(option, 0)
            ev.target.value = cat
          }

          fetcher.submit(ev.target.form)
        }}
        name="category"
        disabled={fetcher.state !== "idle"}
      >
        {!currentCategory && (
          <>
            <option value="$$null$$" hidden disabled>
              Set Category
            </option>
            <hr />
          </>
        )}
        {allCategories.map((c, i) => (
          <option key={i} value={c}>
            {c}
          </option>
        ))}
        <hr />
        <option value="$$new$$">New...</option>
      </select>
    </fetcher.Form>
  )
}

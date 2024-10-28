import { json, LoaderFunction } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import { CategoryPicker } from "~/components/categoryPicker"
import { getCategories } from "~/data/categories"
import { getDownloadClientFiles } from "~/data/downloadClient"
import { DeleteIcon } from "~/icons/deleteIcon"
import { DownIcon } from "~/icons/downIcon"
import { DownloadIcon } from "~/icons/downloadIcon"
import { UpIcon } from "~/icons/upIcon"
import { UserIcon } from "~/icons/userIcon"
import { readableSize, roundToDecimals } from "~/utils/math"
import { readableEta } from "~/utils/time"

export const loader = (async () => {
  const categories = await getCategories()
  const files = await getDownloadClientFiles()

  return json({
    files,
    categories,
    time: new Date(),
  })
}) satisfies LoaderFunction

export default function Index() {
  const { files, categories } = useLoaderData<typeof loader>()
  const fetcher = useFetcher()

  return (
    <>
      <div className="sticky top-[60px] z-10 border-b border-l border-neutral-700 bg-neutral-800 px-2 py-1 text-sm">
        Downloading: {files.length}
      </div>
      <div className="m-2 flex flex-col flex-wrap gap-2 lg:flex-nowrap">
        {files.map((f) => (
          <div
            className="flex flex-col items-center gap-2 bg-neutral-800 p-2 text-sm lg:flex-row"
            key={`downloads-${f.hash}`}
          >
            <div className="flex grow">
              <button
                type="button"
                className="-ml-2 -mt-2 shrink-0 px-2 pt-2 text-neutral-400"
                onClick={() => {
                  prompt(undefined, f.link)
                }}
              >
                #
              </button>
              <p className="grow select-text text-sm">{f.name}</p>
            </div>
            <div className="flex shrink-0 items-center justify-center gap-1 max-sm:flex-col-reverse sm:gap-2">
              <div className="flex shrink-0 items-center justify-center gap-2">
                <span className="text-upload text-sm">
                  <UpIcon />
                  {readableSize(f.up_speed)}
                  /s
                </span>
                {f.speed != null && (
                  <span className="text-download text-sm">
                    <DownIcon />
                    {readableSize(f.speed)}/s
                  </span>
                )}
                <span className="text-transfer shrink-0">
                  <DownloadIcon />{" "}
                  <span>
                    {f.size_done !== f.size &&
                      `${readableSize(f.size_done)}/${readableSize(f.size)}`}
                    {f.size_done === f.size && `${readableSize(f.size)}`}
                  </span>
                </span>
              </div>
              <div className="flex shrink-0 items-center justify-center gap-2">
                <CategoryPicker
                  hash={f.hash}
                  allCategories={categories}
                  currentCategory={f.meta?.category}
                />
                {f.src_count_xfer != null && (
                  <span
                    title={`Total sources: ${f.src_count}\nConnected Sources: ${f.src_count_xfer}${f.last_seen_complete ? `\nLast seen Complete: ${new Date(f.last_seen_complete * 1000).toLocaleString()}` : ""}`}
                  >
                    <UserIcon />
                    {f.src_count_xfer}
                  </span>
                )}
              </div>
            </div>
            <div className="flex w-full shrink-0 lg:w-auto lg:items-center">
              <div
                className={`relative h-7 shrink-0 grow overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 lg:min-w-[200px] lg:grow-0`}
              >
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-bold text-white">
                  {f.status_str === "downloading" && (
                    <>{readableEta(f.eta)} - </>
                  )}
                  {f.status_str === "stopped" && <>Waiting - </>}
                  {f.status_str === "stalled" && <>Stalled - </>}
                  {f.status_str === "completing" && <>Verifying - </>}
                  {f.status_str === "downloaded" && <>Done - </>}
                  {roundToDecimals(f.progress * 100, 3)}%
                </span>
                <div
                  className={`h-full ${
                    f.status_str === "downloading"
                      ? "bg-status-downloading"
                      : f.status_str === "completing"
                        ? "bg-status-completing"
                        : f.status_str === "downloaded"
                          ? "bg-status-downloaded"
                          : "bg-status-stalled"
                  }`}
                  style={{ width: `${f.progress * 100}%` }}
                ></div>
              </div>
              <fetcher.Form
                method="POST"
                action="/api/v2/torrents/delete"
                className="contents"
                onSubmit={(ev) => {
                  const confirmation = confirm(
                    `Are you sure you want to delete?\n\n${f.name}`
                  )
                  if (!confirmation) ev.preventDefault()
                }}
              >
                <input type="hidden" name="hashes" value={f.hash} />
                <button
                  type="submit"
                  title="Remove"
                  disabled={fetcher.state !== "idle"}
                  className="flex h-full items-center p-1 pl-2 text-xl text-red-600"
                >
                  <DeleteIcon />
                </button>
              </fetcher.Form>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

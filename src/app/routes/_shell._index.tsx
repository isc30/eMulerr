import { json, LoaderFunction } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"

export const loader = (async () => {
  return json({ port: process.env.PORT })
}) satisfies LoaderFunction

export default function Index() {
  const data = useLoaderData<typeof loader>()

  return (
    <main className="p-4">
      <h1 className="mb-8">Welcome to eMulerr!</h1>
      <p className="my-2">
        In order to get started, configure the Download Client in *RR:
      </p>
      <ul className="list-disc pl-16">
        <li>Type: qBittorrent</li>
        <li>Name: emulerr</li>
        <li>Host: THIS_CONTAINER_NAME</li>
        <li>Port: {data.port}</li>
        <li>Priority: 50</li>
        <li>Remove completed: Yes</li>
      </ul>
      <p className="my-2 mt-8">Then, configure the indexer in *RR:</p>
      <ul className="list-disc pl-16">
        <li>Type: Torznab</li>
        <li>Name: emulerr</li>
        <li>RSS: No</li>
        <li>Automatic Search: Up to you, maybe it downloads porn</li>
        <li>Interactive Search: Yes</li>
        <li>URL: http://THIS_CONTAINER_NAME:{data.port}/</li>
        <li>Download Client: emulerr</li>
      </ul>
    </main>
  )
}

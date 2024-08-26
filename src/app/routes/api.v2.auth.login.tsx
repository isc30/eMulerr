import { ActionFunction } from "@remix-run/node"

export const action = (async ({ request }) => {
  const formData = await request.formData()
  const password = formData.get("password")

  if (process.env.PASSWORD && process.env.PASSWORD !== password) {
    return new Response(``, {
      status: 401,
      headers: {
        "Content-Type": "text/plain",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=0",
      },
    })
  }

  return new Response(`Ok.`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
      "Set-Cookie": `SID=${password}; path=/`,
    },
  })
}) satisfies ActionFunction

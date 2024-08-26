import { createRequestHandler } from "@remix-run/express"
import { installGlobals } from "@remix-run/node"
import compression from "compression"
import express from "express"
import cookieParser from "cookie-parser"
import basicAuth from "express-basic-auth"

installGlobals()

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      )

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
    : await import("./build/server/index.js"),
})

const app = express()

app.use(cookieParser())
app.use(compression())

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by")

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares)
} else {
  // Vite fingerprints its assets so we can cache forever.
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  )
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("build/client", { maxAge: "1h" }))

// password
if (process.env.PASSWORD !== "") {
  const authMiddleware = basicAuth({
    users: { emulerr: process.env.PASSWORD },
    challenge: true,
    realm: "emulerr",
  })

  app.use((req, res, next) => {
    if (req.path === "/health" || req.path === "/api/v2/auth/login") {
      return next()
    }

    if (
      req.query.apikey === process.env.PASSWORD ||
      req.cookies.SID === process.env.PASSWORD
    ) {
      return next()
    }

    return authMiddleware(req, res, next)
  })
}

// handle SSR requests
app.all("*", remixHandler)

const port = process.env.PORT || 3000
app.listen(port, () =>
  console.log(`Express server listening at http://localhost:${port}`)
)

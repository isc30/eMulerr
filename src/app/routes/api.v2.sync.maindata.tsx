import { ActionFunction, json } from "@remix-run/node"

export const action = (() =>
  json({ rid: 0, full_update: false })) satisfies ActionFunction

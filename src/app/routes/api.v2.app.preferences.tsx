import { LoaderFunction, json } from "@remix-run/node"

export const loader = (() =>
  json({
    save_path: "/downloads/complete",
    temp_path_enabled: true,
    temp_path: "/downloads/incomplete",
    create_subfolder_enabled: false,
    max_ratio_enabled: true,
    max_ratio: 0,
    max_seeding_time_enabled: true,
    max_seeding_time: 0,
  })) satisfies LoaderFunction

export const action = loader

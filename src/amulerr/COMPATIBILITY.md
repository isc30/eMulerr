# qBittorrent API compatibility

Verified against upstream client source (July 2026).

## Sonarr (`QBittorrentProxyV2.cs`)

| Endpoint                                                    | Status                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| `GET /api/v2/app/webapiVersion`                             | Implemented (`text/plain`, `2.11.0`)                         |
| `GET /api/v2/app/version`                                   | Implemented (`text/plain`, `v4.6.7`)                         |
| `GET /api/v2/app/preferences`                               | Implemented (ratio/seeding limits disabled)                  |
| `POST /api/v2/auth/login`                                   | Implemented (`Ok.` + `SID` cookie)                           |
| `GET /api/v2/torrents/info`                                 | Implemented (+ `ratio`, `seeding_time`, `completion_on`, …)  |
| `GET /api/v2/torrents/properties`                           | Implemented — **404 when missing** (fixes `IsTorrentLoaded`) |
| `GET /api/v2/torrents/files`                                | Implemented                                                  |
| `POST /api/v2/torrents/add`                                 | Implemented — **category required** (see below)              |
| `POST /api/v2/torrents/delete`                              | Implemented (`hashes=all` clears shared)                     |
| `POST /api/v2/torrents/setCategory`                         | Implemented                                                  |
| `POST /api/v2/torrents/createCategory`                      | Implemented                                                  |
| `GET /api/v2/torrents/categories`                           | Implemented                                                  |
| `POST /api/v2/torrents/setShareLimits`                      | No-op `Ok`                                                   |
| `POST /api/v2/torrents/topPrio`                             | No-op `Ok`                                                   |
| `POST /api/v2/torrents/setForceStart`                       | No-op `Ok`                                                   |
| `POST /api/v2/torrents/contents`                            | Covered (Medusa alias → same as `/torrents/files`)           |
| `POST /api/v2/torrents/pause` / `resume` / `start` / `stop` | Implemented                                                  |

## Radarr

Same proxy as Sonarr (`QBittorrentProxyV2.cs`); same coverage.

## PyMedusa (`medusa/clients/torrent/qbittorrent.py`)

| Need                                                                                                | Status                                                               |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `webapiVersion` + `auth/login`                                                                      | Covered                                                              |
| `torrents/add` with `urls`, `category`, `savepath`                                                  | Covered — **category required**; `savepath` ignored                  |
| `torrents/info` fields: `hash`, `state`, `ratio`, `downloaded`, `size`, `save_path`, `content_path` | Covered                                                              |
| `torrents/setCategory`, `torrents/delete`                                                           | Covered                                                              |
| `torrents/pause` / `resume` / `stop` / `start`                                                      | Covered via existing routes                                          |
| `POST /api/v2/torrents/contents`                                                                    | Covered — alias of `/torrents/files` (PyMedusa seeding/post-process) |
| `GET /api/v2/torrents/categories`                                                                   | Already covered                                                      |
| `POST /api/v2/torrents/createCategory`                                                              | Already covered                                                      |

## LazyLibrarian GitLab (`lib/qbittorrent.py` + `lazylibrarian/qbittorrent.py`)

| Method                                      | qBittorrent API                 | Status                                                     |
| ------------------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| `api_version`                               | `GET app/webapiVersion`         | Covered                                                    |
| `qbittorrent_version`                       | `GET app/version`               | Covered                                                    |
| `preferences()`                             | `GET app/preferences`           | Covered (`max_ratio_*`, `max_seeding_time_*`)              |
| `torrents(category=…)`                      | `GET torrents/info`             | Covered — unknown category returns `[]`                    |
| `get_torrent(hash)`                         | `GET torrents/properties`       | Covered — 404 while polling after add                      |
| `get_torrent_files(hash)`                   | `GET torrents/files`            | Covered                                                    |
| `download_from_link` / `download_from_file` | `POST torrents/add`             | Covered — **category must be configured** in LazyLibrarian |
| `delete` / `delete_permanently`             | `POST torrents/delete`          | Covered                                                    |
| `pause`                                     | `POST torrents/pause` or `stop` | Covered                                                    |

## Hash / magnet rules

Centralized in `src/lib/links.tsx` and `src/lib/torrents.ts`:

- Internal ed2k: exactly **32 hex**, uppercase (`normalizeEd2kHash`).
- API-facing btih: exactly **40 hex** lowercase, trailing **`00000000`** (`toQbittorrentHashStrict`).
- Genuine non-padded BitTorrent 40-hex hashes are **rejected**.
- Malformed or too-long hashes are **rejected** (no silent slicing).
- All route hash comparisons use `sameEd2kHash()` / normalized sets.
- `fromMagnetLink` only accepts aMulerr magnets with **exact** `tr=http://amulerr` (prefix matches like `http://amulerr.evil` rejected).
- Trailing magnet parameters after `tr=http://amulerr` are accepted.
- Invalid hashes rejected before aMule RPC.

## `/torrents/add` behavior

- `urls` (amulerr magnet) and `category` are **required**.
- Missing/blank `urls` or `category` → **400** plain text (not an unhandled server error).
- Unknown category → **404** plain text.
- Invalid magnet → **400** plain text.
- Duplicate add is **idempotent** (200 + `{}` if hash already in queue/shared).
- aMule requires a category ID; there is no safe default category.

## `/torrents/info` category filter

- `GET /torrents/info?category=unknown` returns **`[]`**, not a server error.
- Avoids \*arr client crashes when polling categories aMulerr does not own.

## `/torrents/properties` behavior note

Sonarr/Radarr `IsTorrentLoaded()` returns true on any HTTP 200 from `/torrents/properties`, so missing torrents **must** be 404. LazyLibrarian treats 404 as retry/failure in its add poll loop (`get_torrent` → falsy).

## JSON response stability

- Strings default to `""`; numbers use `0` or `-1` only when semantically intended.
- `progress` is always **0..1**; `amount_left` and `eta` are never negative.
- `/torrents/files` and `/torrents/contents` return **404 + `[]`** for missing/invalid hashes.

## Harmless unsupported qBittorrent features (no-op or ignored)

- Per-torrent share limits (`setShareLimits`)
- Queue priority (`topPrio`)
- Force start flag (`setForceStart`)
- `savepath` on add (category path from aMule categories)
- `paused` / `stopped` / `ratioLimit` / `sequentialDownload` on add

## Runtime validation

Docker runtime validation with aMule + aMulerr + LazyLibrarian + PyMedusa/Medusa is **still required** before merge upstream.

## Out of scope

- Real BitTorrent magnets (aMulerr magnets only, `tr=http://amulerr`)
- Arbitrary tracker URLs

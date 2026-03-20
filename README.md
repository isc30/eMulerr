# eMulerr

Seamless integration for eD2k/KAD (eMule) networks and Radarr/Sonarr, enjoy.

[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com/r/isc30/emulerr)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Configuring \*arr](#configuring-arr)
- [aMule Configuration Overrides](#amule-configuration-overrides)
- [Torznab API](#torznab-api)
- [qBittorrent API Compatibility](#qbittorrent-api-compatibility)
- [Reverse Proxy Setup](#reverse-proxy-setup)
- [Removing Stale Downloads](#removing-stale-downloads)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

Add the following service to your `docker-compose.yml`:

```yml
services:
  emulerr:
    image: isc30/emulerr:latest
    container_name: emulerr
    restart: unless-stopped
    tty: true
    environment:
      # - PUID=1000 # optional
      # - PGID=1000 # optional
      # - PORT=3000 # optional, web-ui port
      # - ED2K_PORT=4662 # optional, only required when exposing a non-standard port
      # - LOG_LEVEL=info # optional
      # - PASSWORD=1234 # optional, user=emulerr
    ports:
      - "3000:3000" # web ui
      - "4662:4662" # ed2k tcp
      - "4662:4662/udp" # ed2k udp
      # - "4665:4665/udp" # optional, ed2k global search udp (tcp port +3)
    volumes:
      - ./config:/config # required
      - ./downloads:/downloads # required
      # - ./shared:/shared:ro # optional, extra files to be shared via ed2k/kad
```

(Optional) Add eMulerr as a health-checked dependency for Radarr, Sonarr, etc:

```diff
 radarr:
   image: lscr.io/linuxserver/radarr:latest
+  depends_on:
+    emulerr:
+      condition: service_healthy
```

A `/health` endpoint is available for container orchestrators:

```bash
curl http://localhost:3000/health
# {"ok":1}
```

---

## Environment Variables

| Variable    | Default | Required | Description |
|-------------|---------|----------|-------------|
| `PUID`      | `1000`  | No       | User ID for file ownership inside the container |
| `PGID`      | `1000`  | No       | Group ID for file ownership inside the container |
| `PORT`      | `3000`  | No       | Port the web UI and all APIs listen on |
| `ED2K_PORT` | `4662`  | No       | eD2k TCP/UDP port. Only change if you expose a non-standard external port |
| `LOG_LEVEL` | `info`  | No       | Logging verbosity: `error`, `warn`, `info`, `debug` |
| `PASSWORD`  | *(none)*| No       | When set, enables HTTP Basic Auth. Username is always `emulerr`. Also used as the Torznab API key |

**Volumes:**

| Path          | Required | Description |
|---------------|----------|-------------|
| `/config`     | **Yes**  | aMule configuration and state; persists across restarts |
| `/downloads`  | **Yes**  | Download destination. Completed files appear in `/downloads/complete` |
| `/shared`     | No       | Extra files to seed over eD2k/KAD (mount read-only: `:ro`) |

---

## Configuring \*arr

### Download Client

In Radarr / Sonarr → *Settings → Download Clients → Add*:

| Field | Value |
|-------|-------|
| Type | `qBittorrent` |
| Name | `emulerr` (or any label) |
| Host | `emulerr` (Docker service name) or IP |
| Port | `3000` |
| Username | `emulerr` *(only if `PASSWORD` is set)* |
| Password | Value of `PASSWORD` env var *(only if set)* |
| Priority | `50` |

**Remote Path Mappings** (Settings → Download Clients → Remote Path Mappings):

| Field | Value |
|-------|-------|
| Host | `emulerr` |
| Remote Path | `/downloads` |
| Local Path | Path where `/downloads` is mounted on the \*arr host |

### Indexer

In Radarr / Sonarr → *Settings → Indexers → Add*:

| Field | Value |
|-------|-------|
| Type | `Torznab` |
| Name | `emulerr` |
| RSS | `No` |
| Automatic Search | `No` |
| Interactive Search | `Yes` |
| URL | `http://emulerr:3000/` |
| API Key | Value of `PASSWORD` env var *(only if set)* |
| Download Client | `emulerr` |

---

## aMule Configuration Overrides

You can override (or add) any setting from the base `amule.conf` without editing the original file.
At container startup an override file is merged on top of the base configuration.

Location inside the container:
```
/config/amule/amule.overrides.conf
```

Minimal example matching the shipped default with a changed nick:
```ini
[eMule]
Nick=emulerr_test_override
```

---

## Torznab API

eMulerr exposes a [Torznab](https://torznab.github.io/spec-1.3-draft/torznab/) compatible endpoint at `GET /api`.

### Authentication

When `PASSWORD` is set, pass it as `apikey` query parameter or via HTTP Basic Auth:

```bash
curl "http://localhost:3000/api?t=caps&apikey=YOUR_PASSWORD"
```

### Supported Query Types (`t=`)

| Type | Support | Notes |
|------|---------|-------|
| `caps` | ✅ Full | Returns server capabilities and category list |
| `search` | ✅ Full | Plain keyword search against eD2k/KAD network |
| `tvsearch` | ✅ Full | TV search with season/episode normalisation (see below) |
| `movie-search` | ❌ | Not supported; use `search` instead |

### Supported Parameters

| Parameter | Types | Description |
|-----------|-------|-------------|
| `t` | all | Query type (see above) |
| `q` | search, tvsearch | Search query string |
| `season` | tvsearch | Season number (e.g. `2`) or 4-digit year for daily shows |
| `ep` | tvsearch | Episode number, or `YYYY/MM/DD` for daily shows |
| `cat` | search, tvsearch | Comma-separated category IDs to filter results |
| `offset` | search, tvsearch | Pagination offset — only `0` returns results; higher values return empty (no duplicates) |
| `apikey` | all | API key (equals `PASSWORD` env var) |

### Categories

| ID | Name |
|----|------|
| `2000` | Movies |
| `5000` | TV |
| `7000` | Other |
| `10000` | All |

### TV Search — Episode Query Normalisation

eMulerr automatically builds a multi-format search string from `season` + `ep` so that results from differently-named releases are all found:

| Input | Generated search patterns |
|-------|--------------------------|
| `season=2&ep=3` | `2x3`, `2x03`, `S02E03`, `S2E3` |
| `season=2` (no ep) | `2x`, `S02`, `S2` |
| `season=2025&ep=06/15` (daily) | `2025/06/15` |

If your client sends `q=ShowName S02E03` without `season`/`ep` parameters, the plain `search` endpoint handles it correctly too.

### Example Requests

```bash
# Capabilities
curl "http://localhost:3000/api?t=caps"

# Plain search
curl "http://localhost:3000/api?t=search&q=ubuntu+22.04"

# TV search (season + episode)
curl "http://localhost:3000/api?t=tvsearch&q=Breaking+Bad&season=3&ep=7"

# TV search (season only)
curl "http://localhost:3000/api?t=tvsearch&q=Breaking+Bad&season=3"
```

### Response Fields

Each result item includes:

| Field | Description |
|-------|-------------|
| `title` | File name on the eD2k network |
| `guid` | Unique identifier (ed2k magnet link) |
| `link` | ed2k magnet link used to start the download |
| `size` | File size in bytes |
| `category` | Torznab category ID |

---

## qBittorrent API Compatibility

eMulerr implements a subset of the [qBittorrent Web API v2](https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)).
This allows \*arr apps and companion tools to manage downloads as if eMulerr were a real qBittorrent instance.

### Implemented Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v2/auth/login` | Session login (returns `SID` cookie) |
| `GET` | `/api/v2/app/preferences` | Returns download path settings |
| `GET` | `/api/v2/app/webapiVersion` | Returns API version string |
| `GET` | `/api/v2/torrents/info` | List downloads (filterable by `category`) |
| `POST` | `/api/v2/torrents/add` | Add a download via ed2k magnet link |
| `POST` | `/api/v2/torrents/delete` | Remove one or more downloads by hash |
| `GET` | `/api/v2/torrents/categories` | List categories |
| `POST` | `/api/v2/torrents/createCategory` | Create a category |
| `POST` | `/api/v2/torrents/setCategory` | Assign a category to a download |
| `GET` | `/api/v2/sync/maindata` | Sync endpoint (used for polling state) |

### Torrent State Mapping

eMulerr maps internal aMule download states to qBittorrent states:

| aMule state | qBittorrent state |
|-------------|-------------------|
| `downloading` | `downloading` |
| `downloaded` | `pausedUP` |
| `stalled` | `stalledDL` |
| `error` | `error` |
| `completing` | `moving` |
| `stopped` | `pausedDL` |

### Known Limitations

- Only **ed2k magnet links** are supported as download sources — torrent files and regular HTTP URLs are not.
- `max_ratio` and `max_seeding_time` are always reported as `0` (stop immediately after completion).
- No upload speed / ratio tracking.
- The `RSS` and `search` features of the qBittorrent API are not exposed (use the Torznab endpoint instead).

### Quick Connectivity Check

```bash
# Login and obtain session cookie
curl -c cookies.txt -X POST http://localhost:3000/api/v2/auth/login \
  -d "username=emulerr&password=YOUR_PASSWORD"

# List current downloads
curl -b cookies.txt http://localhost:3000/api/v2/torrents/info
```

---

## Reverse Proxy Setup

### NGINX

```nginx
server {
    listen 443 ssl;
    server_name emulerr.example.com;

    ssl_certificate     /etc/ssl/certs/emulerr.crt;
    ssl_certificate_key /etc/ssl/private/emulerr.key;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

### Traefik (docker-compose labels)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.emulerr.rule=Host(`emulerr.example.com`)"
  - "traefik.http.routers.emulerr.entrypoints=websecure"
  - "traefik.http.routers.emulerr.tls.certresolver=myresolver"
  - "traefik.http.services.emulerr.loadbalancer.server.port=3000"
```

### Notes

- eMulerr does **not** add a path prefix. Mount it at the root (`/`) of a (sub)domain or use a path-stripping middleware.
- Set `PASSWORD` to enable built-in HTTP Basic Auth before exposing eMulerr outside your LAN.
- The `/health` endpoint is **always** unauthenticated so orchestrators can check liveness.

---

## Removing Stale Downloads

Since eMulerr simulates the qBittorrent API, it is fully compatible with:
- [Decluttarr](https://github.com/ManiMatter/decluttarr)
- [eMulerrStalledChecker](https://github.com/Jorman/Scripts/tree/master/eMulerrStalledChecker)

---

## Troubleshooting

### Enable debug logging

Set `LOG_LEVEL=debug` in your environment and restart the container:

```yaml
environment:
  - LOG_LEVEL=debug
```

Collect logs:

```bash
docker logs emulerr 2>&1
```

### Common Issues

**\*arr cannot connect to the download client**

- Verify the container name / hostname and port match the Download Client settings.
- Check that the `PASSWORD` value in eMulerr matches the password entered in \*arr.
- Run the quick connectivity check above to test the qBittorrent API directly.

**Search returns no results**

- eMulerr searches the live eD2k/KAD network. Results depend on what is currently indexed.
- Ensure `Interactive Search` is enabled in the \*arr Indexer settings (RSS and Automatic Search are not supported).
- Try a plain keyword search via `curl` to rule out a query-formatting issue.

**Files not appearing after download completes**

- Verify the `/downloads` volume is mounted in both the eMulerr container and the \*arr container.
- Check the Remote Path Mapping — the `Remote Path` must be `/downloads` and the `Local Path` must point to the same directory as seen by the \*arr container.

**Permission errors on downloaded files**

- Set `PUID` and `PGID` to match the user that owns the `/downloads` and `/config` directories on your host.

**Container health check failing**

- The health check calls `GET /health`. Verify the container is running: `docker ps -a`.
- Increase the `--start-period` if aMule takes longer than expected to initialise on your hardware.

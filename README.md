# eMulerr

Seamless integration for eD2k/KAD (eMule) networks and Radarr/Sonarr, enjoy.

[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com/r/isc30/emulerr)

## Running the container

Add the following service to your docker-compose:

```yml
services:
  emulerr:
    image: isc30/emulerr:latest
    container_name: emulerr
    restart: unless-stopped
    tty: true
    environment:
      - PUID=1000
      - PGID=1000
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

(Optional) Add eMulerr as a dependency for Radarr, Sonarr, etc:

```diff
 radarr:
   image: lscr.io/linuxserver/radarr:latest
+  depends_on:
+    emulerr:
+      condition: service_healthy
```

## Configuring *rr

In order to get started, configure the Download Client in *RR:

- Type: `qBittorrent`
- Name: `emulerr`
- Host: `emulerr`
- Port: `3000`
- Username (if using PASSWORD): `emulerr`
- Password (if using PASSWORD): `PASSWORD` (from environment variable)
- Priority: `50`

Also set the Download Client's `Remote Path Mappings`:

- Host: `emulerr`
- Remote Path: `/downloads`
- Local Path: `{The /downloads folder inside MOUNTED PATH FOR RADARR}`

Then, add a new Indexer in *RR:

- Type: `Torznab`
- Name: `emulerr`
- RSS: `No`
- Automatic Search: `No`
- Interactive Search: `Yes`
- URL: `http://emulerr:3000/`
- API Key (if using PASSWORD): `PASSWORD` (from environment variable)
- Download Client: `emulerr`

## aMule configuration overrides

You can override (or add) any setting from the base `amule.conf` without editing the original file.  
At container startup an override file is merged on top of the base configuration.

Location inside the container:
```
/config/amule/amule.overrides.conf
```

If you mounted `./config:/config` (as shown above), the file on the host is:
```
./config/amule/amule.overrides.conf
```

Create (or edit) that file and place only the sections/keys you want to change.  
Rules:
- Sections follow standard INI format: `[SectionName]`
- `key=value` lines override existing keys or get appended if they did not exist
- Keys you omit keep their original value
- Remove a line from overrides → original base value is used again on next container start

Minimal example matching the shipped default with a changed nick:
```ini
[eMule]
Nick=emulerr_ok
[WebServer]
UseGzip=1
```

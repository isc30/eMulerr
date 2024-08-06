# eMulerr

Seamless integration for eD2k/KAD (eMule) networks and Radarr/Sonarr, enjoy.

## Running the container

Add the following service to your docker-compose:

```
emulerr:
  image: isc30/emulerr:latest
  container_name: emulerr
  restart: unless-stopped
  tty: true
  environment:
    - PUID=1000
    - PGID=1000
    - PORT=3000 # optional, default=3000
    - ED2K_PORT=4662 # optional, default=4662
    - LOG_LEVEL=info # optional, default=info
  ports:
    - "3000:3000" # web ui
    - "4662:4662" # ed2k tcp
    - "4662:4662/udp" # ed2k udp
    - "4665:4665/udp" # optional, ed2k global search udp (tcp port +3)
  volumes:
    - ./config:/config # required
    - ./downloads:/downloads # required
```

Add eMulerr as a dependency for Radarr, Sonarr, etc:

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
- Priority: `50`
- Remove completed: `Yes`

Then, configure the indexer in *RR:

- Type: `Torznab`
- Name: `emulerr`
- RSS: `No`
- Automatic Search: `No`
- Interactive Search: `Yes`
- URL: `http://emulerr:3000/`
- Download Client: `emulerr`

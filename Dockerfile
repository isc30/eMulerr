FROM ngosang/amule:2.3.3-17 as amule
ENV PUID=1000
ENV PGID=1000
ENV GUI_PWD=secret
ENV WEBUI_PWD=secret
ENV MOD_AUTO_RESTART_ENABLED=true
ENV MOD_AUTO_RESTART_CRON="0 6 * * *"
ENV MOD_AUTO_SHARE_ENABLED=false
ENV MOD_AUTO_SHARE_DIRECTORIES=/tmp/shared;/downloads/complete
ENV MOD_FIX_KAD_GRAPH_ENABLED=true
ENV MOD_FIX_KAD_BOOTSTRAP_ENABLED=true
RUN mkdir -p /tmp/shared
COPY ./src/amule/api.php /usr/share/amule/webserver/AmuleWebUI-Reloaded/api.php
COPY ./src/amule/amule.conf /config-base/amule/amule.conf
RUN mkdir -p /config/amule
RUN ln -s /config/amule /home/amule/.aMule

FROM node as build
RUN mkdir /app
WORKDIR /app
ADD ./src/package.json ./src/package-lock.json ./
RUN npm install --production=false
ADD ./src ./
RUN npm run build

FROM amule
USER root
RUN apk add --update nodejs npm
ENV NODE_ENV=production
ENV PORT=3000
ENV ED2K_PORT=4662
ENV LOG_LEVEL=info
RUN mkdir -p /emulerr
WORKDIR /emulerr
ADD ./src/package.json ./src/package-lock.json ./
RUN npm install --production=true
COPY --from=build /app/build ./build
COPY --from=build /app/server.js ./server.js

RUN apk add --no-cache bash
# RUN apk add --no-cache mediainfo
# RUN apk add --no-cache ffmpeg

COPY ./src/entrypoint.sh /home/entrypoint.sh
ENTRYPOINT ["/bin/bash", "/home/entrypoint.sh"]
COPY ./src/healthcheck.sh /home/healthcheck.sh
HEALTHCHECK --interval=20s CMD bash "/home/healthcheck.sh"

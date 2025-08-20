#!/usr/bin/env bash

function run_amule() {
    while true; do
        (set_amule_options)
        bash /home/amule/entrypoint.sh
    done
}

function run_emulerr() {
    if [ -d /emulerr-dev ]; then
        cd /emulerr-dev
        npm install --production=false
        env NODE_ENV=development npm run dev
    else
        cd /emulerr
        while true; do
            env NODE_ENV=production npm run start
        done
    fi
}

function set_amule_options() {
    mkdir -p /config/amule
    cp /config-base/amule/amule.conf /config/amule/amule.conf
	# apply overrides
	bash /config-base/amule/merge_overrides.sh
    sed -i "s/Port=4662/Port=$ED2K_PORT/g" /config/amule/amule.conf
    sed -i "s/UDPPort=4672/UDPPort=$ED2K_PORT/g" /config/amule/amule.conf
    echo $'/tmp/shared\n/downloads/complete'| cat>| /config/amule/shareddir.dat
    rm -f /config/amule/muleLock
    rm -f /config/amule/ipfilter* # remove when bug is fixed
    chown -R "${PUID}:${PGID}" /config
    chown -R "${PUID}:${PGID}" /downloads
}

(run_amule) &
(run_emulerr) &

wait

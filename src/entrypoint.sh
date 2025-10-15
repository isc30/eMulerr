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
    touch /config/amule/amule.overrides.conf
    python3 - <<'EOF'
import configparser

config_path = "/config/amule/amule.conf"
overrides_path = "/config/amule/amule.overrides.conf"

# Read with interpolation enabled
config = configparser.ConfigParser()
config.optionxform = str
config.read(config_path) 

# Read override without interpolation to avoid breaking existing references
override = configparser.ConfigParser(interpolation=None)
override.optionxform = str
override.read(overrides_path) 

for section in override.sections():
    if not config.has_section(section):
        config.add_section(section)
    for key, value in override.items(section):
        config.set(section, key, value)

with open(config_path, "w") as f:
    config.write(f)
EOF
    sed -i "s/Port=4662/Port=$ED2K_PORT/g" /config/amule/amule.conf
    sed -i "s/UDPPort=4672/UDPPort=$ED2K_PORT/g" /config/amule/amule.conf
    echo $'/tmp/shared\n/downloads/complete'| cat>| /config/amule/shareddir.dat
    rm -f /config/amule/muleLock
    rm -f /config/amule/ipfilter* # remove when bug is fixed
    chown -R "${PUID}:${PGID}" /config
    chown -R "${PUID}:${PGID}" /downloads
    mkdir -p /downloads/complete
}

(run_amule) &
(run_emulerr) &

wait

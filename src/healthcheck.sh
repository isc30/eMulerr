#!/usr/bin/env bash

emulerrOk=$(curl -LI http://localhost:$PORT/health -o /dev/null -w '%{http_code}' -s)

if [ ${emulerrOk} -eq 200 ]; then
    exit 0
else
    exit 1
fi

#!/usr/bin/env bash
# Uso: stop-ports.sh "<mensaje final>" <puerto> [puerto...]
label="$1"
shift
for p in "$@"; do
  for pid in $(netstat -ano | grep -E ":$p .*LISTENING" | awk '{print $NF}' | sort -u); do
    echo "killing :$p -> PID $pid"
    taskkill //F //PID "$pid" >/dev/null 2>&1
  done
done
echo "$label"

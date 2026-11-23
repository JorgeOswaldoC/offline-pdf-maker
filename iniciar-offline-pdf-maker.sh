#!/usr/bin/env bash
set -euo pipefail

repo="$HOME/Documentos/offline-pdf-maker"
state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/offline-pdf-maker"
port=8765

if ! ip=$(tailscale ip -4) || [[ -z $ip ]]; then
    printf 'No se pudo obtener la IP de Tailscale del servidor.\n' >&2
    exit 1
fi

url="http://$ip:$port/"
mkdir -p "$state_dir/public"
exec 9>"$state_dir/start.lock"
flock 9

for asset in index.html manifest.json sw.js css icons js; do
    ln -sfn "$repo/$asset" "$state_dir/public/$asset"
done

app_responds() {
    curl --noproxy '*' -fsS --max-time 1 "$url" 2>/dev/null |
        cmp -s "$repo/index.html" -
}

if ! app_responds; then
    nohup python3 -m http.server "$port" --bind "$ip" --directory "$state_dir/public" \
        </dev/null >>"$state_dir/server.log" 2>&1 9>&- &
    server_pid=$!
    for ((attempt = 0; attempt < 25; attempt++)); do
        if app_responds; then
            break
        fi
        if ! kill -0 "$server_pid" 2>/dev/null; then
            break
        fi
        sleep 0.2
    done
    if ! app_responds; then
        printf 'La app no responde. Revisa %s\n' "$state_dir/server.log" >&2
        exit 1
    fi
fi

printf '%s\n' "$url"

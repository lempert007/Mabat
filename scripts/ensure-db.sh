#!/usr/bin/env bash
# Makes sure PostgreSQL is listening before the backend tries to reach it.
#
# Uses whatever is already running, so a local install (Postgres.app, a system service) is left
# alone. Only when nothing answers does it fall back to starting the database container.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

# Only the connection string matters here. A value already in the environment wins, so a caller
# can point this at another database without editing .env.
if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' .env | tail -1)"
fi

url="${DATABASE_URL:-postgresql+asyncpg://mabat:change-me@localhost:5432/mabat}"
read -r host port <<<"$(
  python3 - "$url" <<'PY'
import sys
from urllib.parse import urlsplit

parts = urlsplit(sys.argv[1])
print(parts.hostname or "localhost", parts.port or 5432)
PY
)"

reachable() { nc -z -w 2 "$host" "$port" >/dev/null 2>&1; }

if reachable; then
  echo "PostgreSQL is already listening on $host:$port"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Nothing is listening on $host:$port, and docker is not available to start one." >&2
  echo "Start PostgreSQL yourself, or set DATABASE_URL in .env to point somewhere that is." >&2
  exit 1
fi

echo "Nothing on $host:$port. Starting the database container…"
docker compose up -d db

for _ in $(seq 1 60); do
  if reachable; then
    echo "PostgreSQL is up on $host:$port"
    exit 0
  fi
  sleep 1
done

echo "The database container did not start listening on $host:$port in time." >&2
exit 1

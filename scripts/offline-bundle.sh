#!/usr/bin/env sh
# Packs every image the deployment runs into one file, for a host with no internet.
# Run it on a connected machine, then carry mabat-images.tar, this repository and .env across.
set -e
cd "$(dirname "$0")/.."

# Compose insists on the secret even to build; the images never contain it.
export MABAT_SECRET_KEY="${MABAT_SECRET_KEY:-build-only}"
docker compose build
docker compose pull db
docker save -o mabat-images.tar $(docker compose config --images)
echo "Wrote mabat-images.tar. On the offline host: docker load -i mabat-images.tar && docker compose up -d --no-build"

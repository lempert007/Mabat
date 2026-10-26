# Windows counterpart of offline-bundle.sh: packs every image the deployment runs into one file,
# for a host with no internet. Carry mabat-images.tar, this repository and .env across.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

# Compose insists on the secret even to build; the images never contain it.
if (-not $env:MABAT_SECRET_KEY) { $env:MABAT_SECRET_KEY = 'build-only' }
docker compose build
if (-not $?) { exit 1 }
docker compose pull db
if (-not $?) { exit 1 }
$images = docker compose config --images
docker save -o mabat-images.tar @images
if (-not $?) { exit 1 }
Write-Host 'Wrote mabat-images.tar. On the offline host: docker load -i mabat-images.tar; docker compose up -d --no-build'

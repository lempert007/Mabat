# Windows counterpart of ensure-db.sh: makes sure PostgreSQL is listening before the backend
# tries to reach it.
#
# Uses whatever is already running. When nothing answers it tries, in order, a PostgreSQL
# Windows service (what the EnterpriseDB installer registers), then the database container.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Only the connection string matters here. A value already in the environment wins, so a caller
# can point this at another database without editing .env.
$url = $env:DATABASE_URL
if (-not $url -and (Test-Path .env)) {
    $line = Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -Last 1
    if ($line) { $url = $line -replace '^DATABASE_URL=', '' }
}
if (-not $url) { $url = 'postgresql+asyncpg://mabat:change-me@localhost:5432/mabat' }

# System.Uri does not understand the "+asyncpg" scheme, so parse the authority by hand.
$dbHost = 'localhost'
$port = 5432
if ($url -match '^[^:]+://(?:[^@/]*@)?(\[[^\]]+\]|[^:/?]+)(?::(\d+))?') {
    $dbHost = $Matches[1].Trim('[', ']')
    if ($Matches[2]) { $port = [int]$Matches[2] }
}

function Test-Reachable {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $pending = $client.BeginConnect($dbHost, $port, $null, $null)
        if (-not $pending.AsyncWaitHandle.WaitOne(2000)) { return $false }
        $client.EndConnect($pending)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Wait-Reachable([int]$seconds) {
    for ($i = 0; $i -lt $seconds; $i++) {
        if (Test-Reachable) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

if (Test-Reachable) {
    Write-Host "PostgreSQL is already listening on ${dbHost}:${port}"
    exit 0
}

$service = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($service) {
    Write-Host "Nothing on ${dbHost}:${port}. Starting the $($service.Name) service..."
    try {
        Start-Service -Name $service.Name
    } catch {
        Write-Error ("Could not start $($service.Name): $($_.Exception.Message) " +
            "Start it once from an administrator shell, or set it to start automatically.")
    }
    if (Wait-Reachable 30) {
        Write-Host "PostgreSQL is up on ${dbHost}:${port}"
        exit 0
    }
    Write-Error "$($service.Name) is running but nothing is listening on ${dbHost}:${port}."
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Nothing on ${dbHost}:${port}. Starting the database container..."
    docker compose up -d db
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    if (Wait-Reachable 60) {
        Write-Host "PostgreSQL is up on ${dbHost}:${port}"
        exit 0
    }
    Write-Error "The database container did not start listening on ${dbHost}:${port} in time."
}

Write-Host "Nothing is listening on ${dbHost}:${port}, and there is no PostgreSQL service or docker to start one." -ForegroundColor Red
Write-Host 'Install PostgreSQL (winget install PostgreSQL.PostgreSQL.16), or set DATABASE_URL in .env to point somewhere that is.' -ForegroundColor Red
exit 1

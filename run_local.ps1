[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repoDir = $PSScriptRoot
$addonDir = Join-Path $repoDir "baby-buddy-dashboard"
$envFile = Join-Path $repoDir ".env"
$venvDir = Join-Path $repoDir ".venv"
$localDataDir = Join-Path $repoDir ".local-data"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Fichier .env introuvable. Copiez .env.example vers .env et renseignez vos paramètres."
}

Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line -match "^([^=]+)=(.*)$") {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
}

New-Item -ItemType Directory -Path $localDataDir -Force | Out-Null
if (-not $env:MILK_WASTE_FILE) {
    $env:MILK_WASTE_FILE = Join-Path $localDataDir "milk-waste.json"
}

if (-not (Test-Path -LiteralPath $venvDir)) {
    python -m venv $venvDir
}

$python = Join-Path $venvDir "Scripts\python.exe"
& $python -m pip install --disable-pip-version-check -r (Join-Path $addonDir "backend\requirements.txt")

$frontendDir = Join-Path $addonDir "frontend"
if (-not (Test-Path -LiteralPath (Join-Path $frontendDir "node_modules"))) {
    npm --prefix $frontendDir ci
}

$backend = $null
$frontend = $null
try {
    $backend = Start-Process -FilePath $python -ArgumentList @(
        "-m", "uvicorn", "backend.server:app",
        "--host", "0.0.0.0",
        "--port", "8099",
        "--log-level", "info",
        "--app-dir", $addonDir
    ) -NoNewWindow -PassThru

    $frontend = Start-Process -FilePath "npm.cmd" -ArgumentList @(
        "--prefix", $frontendDir, "run", "dev"
    ) -NoNewWindow -PassThru

    Write-Host "Dashboard : http://localhost:5173"
    Write-Host "Backend   : http://localhost:8099"
    Write-Host "Appuyez sur Ctrl+C pour arrêter."
    Wait-Process -Id $backend.Id, $frontend.Id
}
finally {
    @($backend, $frontend) |
        Where-Object { $_ -and -not $_.HasExited } |
        ForEach-Object { Stop-Process -Id $_.Id -ErrorAction SilentlyContinue }
}

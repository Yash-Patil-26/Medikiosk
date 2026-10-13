$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

if (-not (Test-Path (Join-Path $ProjectRoot "server/.env"))) {
    throw "server/.env is missing. Run .\setup.ps1 first and configure it."
}

Write-Host "Starting MediKiosk frontend and backend. Press Ctrl+C to stop." -ForegroundColor Cyan
npm run dev
if ($LASTEXITCODE -ne 0) {
    throw "MediKiosk exited with code $LASTEXITCODE."
}

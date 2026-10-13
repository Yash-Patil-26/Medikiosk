$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "`n=== MediKiosk setup ===" -ForegroundColor Cyan

function Require-Command([string]$Name, [string]$Hint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name was not found. $Hint"
    }
}

Require-Command "node" "Install Node.js 22.x and reopen PowerShell."
Require-Command "npm" "Install Node.js with npm and reopen PowerShell."
Require-Command "git" "Install Git and reopen PowerShell."

Write-Host "`n-- Tool versions --"
node --version
npm --version
git --version

$nodeMajor = [int]((node -p "process.versions.node.split('.')[0]").Trim())
if ($nodeMajor -lt 20) {
    throw "Node.js 20+ is required. Prefer Node.js 22.x."
}

Write-Host "`n-- MySQL availability --"
$mysqlCli = Get-Command mysql -ErrorAction SilentlyContinue
if ($mysqlCli) {
    & mysql --version
} else {
    $mysqlCandidates = @(
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe"
    )
    $mysqlPath = $mysqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($mysqlPath) {
        & $mysqlPath --version
    } else {
        Write-Warning "mysql.exe was not found in PATH or common locations. Verify MySQL Server manually."
    }
}

$mysqlService = Get-Service -Name "MySQL80" -ErrorAction SilentlyContinue
if ($mysqlService) {
    Write-Host "MySQL80 service: $($mysqlService.Status)"
    if ($mysqlService.Status -ne "Running") {
        Write-Warning "MySQL80 is not running. Start it before running the app."
    }
} else {
    Write-Warning "Windows service MySQL80 was not found. Verify your MySQL service name."
}

$port = Test-NetConnection 127.0.0.1 -Port 3306 -WarningAction SilentlyContinue
if ($port.TcpTestSucceeded) {
    Write-Host "MySQL port 3306 is reachable."
} else {
    Write-Warning "127.0.0.1:3306 is not reachable. Start/configure MySQL before running the app."
}

Write-Host "`n-- Validate package manifests --"
foreach ($relative in @("package.json", "server/package.json", "client/package.json")) {
    $path = Join-Path $ProjectRoot $relative
    if (-not (Test-Path $path)) { throw "Required manifest missing: $relative" }
    try { Get-Content $path -Raw | ConvertFrom-Json | Out-Null }
    catch { throw "Invalid JSON in $relative. $($_.Exception.Message)" }
    Write-Host "OK: $relative"
}

foreach ($relative in @("server/package.json", "client/package.json")) {
    $manifest = Get-Content (Join-Path $ProjectRoot $relative) -Raw | ConvertFrom-Json
    if ($manifest.dependencies -and $manifest.dependencies.medikiosk -eq "file:..") {
        throw "Setup paused: $relative declares unused 'medikiosk': 'file:..'. Remove it and regenerate that package's lockfile before setup."
    }
}

Write-Host "`n-- Environment file --"
$envExample = Join-Path $ProjectRoot ".env.example"
$serverDir = Join-Path $ProjectRoot "server"
$serverEnv = Join-Path $serverDir ".env"
if (-not (Test-Path $envExample)) { throw ".env.example is missing." }
if (-not (Test-Path $serverEnv)) {
    Copy-Item $envExample $serverEnv
    Write-Host "Created server/.env from .env.example."
    Write-Warning "Edit server/.env; set DB_PASSWORD as needed and replace JWT_SECRET with a unique random value."
} else {
    Write-Host "server/.env already exists; left unchanged."
}

foreach ($folder in @(".", "server", "client")) {
    Write-Host "`n-- npm ci in $folder --"
    Push-Location (Join-Path $ProjectRoot $folder)
    try {
        npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed in $folder." }
    } finally {
        Pop-Location
    }
}

Write-Host "`nSetup complete." -ForegroundColor Green
Write-Host "Next: configure server/.env, create database 'medikiosk', review/apply database/schema.sql, and optionally apply database/seed.sql."
Write-Host "Then run .\run.ps1"

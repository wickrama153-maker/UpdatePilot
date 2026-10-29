# Prepare embedded resources for UpdatePilot Windows Desktop Electron packaging
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path "$PSScriptRoot\..").ProviderPath
$desktopDir = "$repoRoot\apps\desktop"
$targetDir = "$desktopDir\build-resources"

Write-Host "=== Preparing UpdatePilot Desktop Build Resources ==="
Write-Host "Target: $targetDir"

# Clean previous build-resources
if (Test-Path $targetDir) {
    Remove-Item $targetDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

# 0. Ensure workspaces are built
Write-Host " Compiling backend..."
Push-Location "$repoRoot\apps\backend"
& npm.cmd run build
Pop-Location

Write-Host " Compiling agent..."
Push-Location "$repoRoot\apps\agent"
& npm.cmd run build
Pop-Location

Write-Host " Ensuring web static export..."
if (-not (Test-Path "$repoRoot\apps\web\out\index.html")) {
    Push-Location "$repoRoot\apps\web"
    & npm.cmd run build
    Pop-Location
}

# 1. Backend compiled assets
$backendDistTarget = "$targetDir\backend\dist"
New-Item -ItemType Directory -Path $backendDistTarget -Force | Out-Null
Copy-Item "$repoRoot\apps\backend\dist\*" $backendDistTarget -Recurse -Force
Write-Host " Copied backend dist"

# 2. Backend Prisma schema and SQLite database
$backendPrismaTarget = "$targetDir\backend\prisma"
New-Item -ItemType Directory -Path $backendPrismaTarget -Force | Out-Null
Copy-Item "$repoRoot\apps\backend\prisma\dev.db" "$backendPrismaTarget\dev.db" -Force
Copy-Item "$repoRoot\apps\backend\prisma\schema.prisma" "$backendPrismaTarget\schema.prisma" -Force
Write-Host " Copied backend Prisma database and schema"

# 3. Agent compiled assets
$agentDistTarget = "$targetDir\agent\dist"
New-Item -ItemType Directory -Path $agentDistTarget -Force | Out-Null
Copy-Item "$repoRoot\apps\agent\dist\*" $agentDistTarget -Recurse -Force
Write-Host " Copied agent dist"

# 4. Web static export (out)
$webOutTarget = "$targetDir\web\out"
New-Item -ItemType Directory -Path $webOutTarget -Force | Out-Null
Copy-Item "$repoRoot\apps\web\out\*" $webOutTarget -Recurse -Force
Write-Host " Copied web static export"

# 5. Shared library compiled assets
$sharedDistTarget = "$targetDir\packages\shared\dist"
New-Item -ItemType Directory -Path $sharedDistTarget -Force | Out-Null
Copy-Item "$repoRoot\packages\shared\dist\*" $sharedDistTarget -Recurse -Force
Copy-Item "$repoRoot\packages\shared\package.json" "$targetDir\packages\shared\package.json" -Force
Write-Host " Copied shared package"

# 6. Install clean production runtime node_modules
Write-Host " Installing clean production runtime dependencies in build-resources..."
$runtimePkg = @"
{
  "name": "updatepilot-runtime",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@prisma/client": "^5.19.0",
    "axios": "^1.7.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.1",
    "uuid": "^10.0.0",
    "zod": "^3.23.8"
  }
}
"@
Set-Content -Path "$targetDir\package.json" -Value $runtimePkg -Encoding UTF8

Push-Location $targetDir
& npm.cmd install --omit=dev --no-audit --no-fund
Pop-Location

# Copy Prisma query engine and pre-generated client from repo root to build-resources
if (Test-Path "$repoRoot\node_modules\@prisma\client") {
    Copy-Item "$repoRoot\node_modules\@prisma\client\*" "$targetDir\node_modules\@prisma\client" -Recurse -Force
    Write-Host " Copied pre-generated @prisma/client"
}
if (Test-Path "$repoRoot\node_modules\.prisma") {
    Copy-Item "$repoRoot\node_modules\.prisma\*" "$targetDir\node_modules\.prisma" -Recurse -Force
    Write-Host " Copied .prisma engine binaries"
}

# Link shared package into node_modules
$sharedModuleDir = "$targetDir\node_modules\@updatepilot\shared"
New-Item -ItemType Directory -Path $sharedModuleDir -Force | Out-Null
Copy-Item "$targetDir\packages\shared\*" $sharedModuleDir -Recurse -Force

Write-Host "=== Desktop Build Resources Preparation Complete ==="

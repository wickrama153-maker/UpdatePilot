# Prepare embedded resources for UpdatePilot Windows Desktop Electron packaging
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$desktopDir = Join-Path $repoRoot "apps\desktop"
$targetDir = Join-Path $desktopDir "build-resources"

Write-Host "=== Preparing UpdatePilot Desktop Build Resources ==="
Write-Host "Target: $targetDir"

# Clean previous build-resources
if (Test-Path $targetDir) {
    Remove-Item $targetDir -Recurse -Force
}
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

# 1. Backend compiled assets
$backendDistTarget = Join-Path $targetDir "backend\dist"
New-Item -ItemType Directory -Path $backendDistTarget -Force | Out-Null
Copy-Item (Join-Path $repoRoot "apps\backend\dist\*") $backendDistTarget -Recurse -Force
Write-Host " Copied backend dist"

# 2. Backend Prisma schema and SQLite database
$backendPrismaTarget = Join-Path $targetDir "backend\prisma"
New-Item -ItemType Directory -Path $backendPrismaTarget -Force | Out-Null
Copy-Item (Join-Path $repoRoot "apps\backend\prisma\dev.db") (Join-Path $backendPrismaTarget "dev.db") -Force
Copy-Item (Join-Path $repoRoot "apps\backend\prisma\schema.prisma") (Join-Path $backendPrismaTarget "schema.prisma") -Force
Write-Host " Copied backend Prisma database and schema"

# 3. Agent compiled assets
$agentDistTarget = Join-Path $targetDir "agent\dist"
New-Item -ItemType Directory -Path $agentDistTarget -Force | Out-Null
Copy-Item (Join-Path $repoRoot "apps\agent\dist\*") $agentDistTarget -Recurse -Force
Write-Host " Copied agent dist"

# 4. Web static export (out)
$webOutTarget = Join-Path $targetDir "web\out"
New-Item -ItemType Directory -Path $webOutTarget -Force | Out-Null
Copy-Item (Join-Path $repoRoot "apps\web\out\*") $webOutTarget -Recurse -Force
Write-Host " Copied web static export"

# 5. Shared library compiled assets
$sharedDistTarget = Join-Path $targetDir "packages\shared\dist"
New-Item -ItemType Directory -Path $sharedDistTarget -Force | Out-Null
Copy-Item (Join-Path $repoRoot "packages\shared\dist\*") $sharedDistTarget -Recurse -Force
Copy-Item (Join-Path $repoRoot "packages\shared\package.json") (Join-Path $targetDir "packages\shared\package.json") -Force
Write-Host " Copied shared package"

# 6. Copy runtime dependencies for backend and agent into build-resources/node_modules
$targetModules = Join-Path $targetDir "node_modules"
New-Item -ItemType Directory -Path $targetModules -Force | Out-Null

$requiredPackages = @(
    "@prisma",
    ".prisma",
    "express",
    "cors",
    "dotenv",
    "axios",
    "uuid",
    "zod",
    "swagger-ui-express",
    "swagger-jsdoc",
    "jsonwebtoken",
    "body-parser",
    "cookie-parser",
    "debug",
    "ms",
    "statuses",
    "safe-buffer",
    "depd",
    "finalhandler",
    "vary",
    "content-disposition",
    "content-type",
    "encodeurl",
    "escape-html",
    "etag",
    "fresh",
    "merge-descriptors",
    "methods",
    "on-finished",
    "parseurl",
    "path-to-regexp",
    "proxy-addr",
    "qs",
    "range-parser",
    "send",
    "serve-static",
    "setprototypeof",
    "type-is",
    "utils-merge",
    "ipaddr.js",
    "mime-types",
    "mime-db",
    "forwarded",
    "media-typer",
    "inherits",
    "toidentifier",
    "unpipe",
    "safer-buffer",
    "bytes",
    "http-errors",
    "raw-body",
    "iconv-lite",
    "destroy",
    "negotiator",
    "accepts",
    "array-flatten",
    "ee-first"
)

$sourceModules = Join-Path $repoRoot "node_modules"
foreach ($pkg in $requiredPackages) {
    $src = Join-Path $sourceModules $pkg
    if (Test-Path $src) {
        $dest = Join-Path $targetModules $pkg
        $parent = Split-Path $dest -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item $src $dest -Recurse -Force
    }
}

# Also ensure backend has local link to packages/shared
$backendModules = Join-Path $targetDir "backend\node_modules"
New-Item -ItemType Directory -Path (Join-Path $backendModules "@updatepilot") -Force | Out-Null
Copy-Item (Join-Path $targetDir "packages\shared") (Join-Path $backendModules "@updatepilot\shared") -Recurse -Force

$agentModules = Join-Path $targetDir "agent\node_modules"
New-Item -ItemType Directory -Path (Join-Path $agentModules "@updatepilot") -Force | Out-Null
Copy-Item (Join-Path $targetDir "packages\shared") (Join-Path $agentModules "@updatepilot\shared") -Recurse -Force

Write-Host " Copied runtime node_modules and local workspace packages"
Write-Host "=== Desktop Build Resources Preparation Complete ==="

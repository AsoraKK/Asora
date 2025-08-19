# Azure Functions v4 Packaging Script (Windows PowerShell)
# Creates production-ready zip with correct root layout

Write-Host "🚀 Azure Functions v4 Packaging Started" -ForegroundColor Green

# Clean previous artifacts
Write-Host "🧹 Cleaning previous artifacts..." -ForegroundColor Yellow
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, deploy, dist-v4-final.zip

# Install production dependencies only
Write-Host "📦 Installing production dependencies..." -ForegroundColor Yellow
npm ci --omit=dev

# Build TypeScript to dist/src/*
Write-Host "🔨 Building TypeScript..." -ForegroundColor Yellow
npm run build

# Create staging directory
Write-Host "📁 Creating deployment staging..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path deploy | Out-Null

# Copy essential files to zip root
Write-Host "📋 Copying configuration files..." -ForegroundColor Yellow
Copy-Item host.json, package.json -Destination deploy/

# Copy compiled source
Write-Host "📄 Copying compiled source..." -ForegroundColor Yellow
Copy-Item -Recurse dist/src -Destination deploy/src

# Copy production node_modules
Write-Host "📚 Copying production node_modules..." -ForegroundColor Yellow
Copy-Item -Recurse node_modules -Destination deploy/node_modules

# Create final zip (paths relative to zip root)
Write-Host "🗜️  Creating deployment zip..." -ForegroundColor Yellow
Push-Location deploy
Compress-Archive -Path * -DestinationPath ../dist-v4-final.zip -Force
Pop-Location

# Verify zip contents
Write-Host "✅ Zip contents verification:" -ForegroundColor Green
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("$PWD\dist-v4-final.zip")
$zip.Entries | Select-Object -First 20 Name, Length | Format-Table
$zip.Dispose()

$zipSize = (Get-Item dist-v4-final.zip).Length / 1MB
Write-Host "📦 Package complete: dist-v4-final.zip ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
Write-Host "🎯 Ready for: az functionapp deployment source config-zip" -ForegroundColor Cyan

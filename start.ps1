$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $root 'backend\.env'))) { throw 'Chua co backend/.env. Hay chay setup.ps1 truoc.' }
if (-not (Test-Path (Join-Path $root 'backend\node_modules'))) { throw 'Backend chua cai npm. Hay chay setup.ps1.' }
if (-not (Test-Path (Join-Path $root 'frontend\node_modules'))) { throw 'Frontend chua cai npm. Hay chay setup.ps1.' }
Start-Process -FilePath powershell.exe -WorkingDirectory (Join-Path $root 'backend') -ArgumentList @('-NoExit','-Command','npm run dev')
Start-Sleep -Seconds 2
Start-Process -FilePath powershell.exe -WorkingDirectory (Join-Path $root 'frontend') -ArgumentList @('-NoExit','-Command','npm run dev')
Write-Host 'Backend: http://localhost:4100/health' -ForegroundColor Green
Write-Host 'Frontend: http://localhost:5174' -ForegroundColor Green
Write-Host 'Mo trinh duyet tai http://localhost:5174' -ForegroundColor Yellow

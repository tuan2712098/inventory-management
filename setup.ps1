$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
Write-Host 'KIEM TRA MOI TRUONG INVENTORY...' -ForegroundColor Cyan
node --version
if ($LASTEXITCODE -ne 0) { throw 'Chua cai Node.js' }
npm --version
if ($LASTEXITCODE -ne 0) { throw 'Chua cai npm' }
$service = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($service -and $service.Status -ne 'Running') { Start-Service MongoDB }
if (-not $service) { Write-Host 'Khong tim thay Windows service MongoDB; dam bao MongoDB dang chay tai 127.0.0.1:27017.' -ForegroundColor Yellow }
$envPath = Join-Path $root 'backend\.env'
if (-not (Test-Path $envPath)) {
    $secret1 = node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))"
    $secret2 = node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))"
    $settings = "PORT=4100`nMONGO_URI=mongodb://127.0.0.1:27017/inventory_management`nJWT_SECRET=$secret1`nJWT_REFRESH_SECRET=$secret2`nFRONTEND_ORIGIN=http://localhost:5174`nNODE_ENV=development`nMONGO_TRANSACTIONS=false`n"
    [IO.File]::WriteAllText($envPath, $settings, [Text.UTF8Encoding]::new($false))
    Write-Host 'Da tao file backend/.env voi JWT secret ngau nhien.' -ForegroundColor Green
} else { Write-Host 'Giu nguyen backend/.env hien tai.' -ForegroundColor Yellow }
Write-Host 'CAI DAT BACKEND...' -ForegroundColor Cyan
npm install --prefix .\backend
if ($LASTEXITCODE -ne 0) { throw 'Loi npm install backend' }
Write-Host 'CAI DAT FRONTEND...' -ForegroundColor Cyan
npm install --prefix .\frontend
if ($LASTEXITCODE -ne 0) { throw 'Loi npm install frontend' }
Write-Host 'TAO DU LIEU DEMO...' -ForegroundColor Cyan
npm run seed --prefix .\backend
if ($LASTEXITCODE -ne 0) { throw 'Khong seed duoc. Kiem tra MongoDB dang chay.' }
Write-Host 'DA SETUP XONG. LUU MAT KHAU DEMO O PHIA TREN, SAU DO CHAY .\start.ps1' -ForegroundColor Green

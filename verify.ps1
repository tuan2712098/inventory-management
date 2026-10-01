$ErrorActionPreference = 'Stop'
$api = 'http://localhost:4100'
try {
    $health = Invoke-RestMethod -Uri "$api/health" -ErrorAction Stop
    if ($health.status -ne 'ok' -or $health.database -ne 'connected') { throw 'Backend hoac MongoDB chua san sang' }
    Write-Host '1/4 Backend va MongoDB: OK' -ForegroundColor Green
    $secure = Read-Host 'Nhap mat khau demo da hien khi seed' -AsSecureString
    $password = [System.Net.NetworkCredential]::new('', $secure).Password
    $login = Invoke-RestMethod -Uri "$api/api/auth/login" -Method Post -ContentType 'application/json' -Body (@{ email='admin@inventory.local'; password=$password } | ConvertTo-Json) -ErrorAction Stop
    if ($login.user.role -ne 'super_admin') { throw 'Tai khoan login khong phai admin' }
    Write-Host '2/4 JWT dang nhap admin: OK' -ForegroundColor Green
    $headers = @{ Authorization="Bearer $($login.accessToken)" }
    $products = Invoke-RestMethod -Uri "$api/api/products" -Headers $headers -ErrorAction Stop
    $warehouses = Invoke-RestMethod -Uri "$api/api/warehouses" -Headers $headers -ErrorAction Stop
    $summary = Invoke-RestMethod -Uri "$api/api/reports/summary" -Headers $headers -ErrorAction Stop
    if ($products.total -lt 1 -or $warehouses.total -lt 1) { throw 'Chua co du lieu kho hoac san pham demo' }
    Write-Host "3/4 San pham: $($products.total) | Kho: $($warehouses.total) | Gia tri ton: $($summary.totals.inventoryValue) VND" -ForegroundColor Green
    $viewer = Invoke-RestMethod -Uri "$api/api/auth/login" -Method Post -ContentType 'application/json' -Body (@{ email='viewer@inventory.local'; password=$password } | ConvertTo-Json) -ErrorAction Stop
    $viewerHeaders = @{ Authorization="Bearer $($viewer.accessToken)" }
    $denied = $false
    try { Invoke-RestMethod -Uri "$api/api/categories" -Method Post -Headers $viewerHeaders -ContentType 'application/json' -Body (@{name='BLOCKED DEMO';code='BLOCKED-DEMO'}|ConvertTo-Json) -ErrorAction Stop | Out-Null }
    catch { if ([int]$_.Exception.Response.StatusCode -eq 403) { $denied = $true } else { throw } }
    if (-not $denied) { throw 'Kiem tra phan quyen viewer that bai' }
    Write-Host '4/4 Viewer bi chan tao danh muc: OK (HTTP 403)' -ForegroundColor Green
    Write-Host 'KIEM TRA API CO BAN THANH CONG. Hay mo http://localhost:5174 de kiem tra giao dien.' -ForegroundColor Green
}
catch { Write-Host "KIEM TRA THAT BAI: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
finally { Remove-Variable password,secure,login,viewer -ErrorAction SilentlyContinue }

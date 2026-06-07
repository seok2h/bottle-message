# DB 시드 재적용 스크립트 (Windows / PowerShell)
# 보통은 'docker compose up -d' 첫 기동 시 db/*.sql 이 자동 적용되므로 불필요하다.
# 볼륨을 지우지 않고 스키마/시드만 다시 적용하고 싶을 때 사용한다.
#
#   ./scripts/init-db.ps1
#
# docker cp 로 복사 후 적용 → 어떤 환경에서도 안전하게 동작.

$ErrorActionPreference = "Stop"
$container = "bottle_db"
$dbDir = Join-Path (Split-Path $PSScriptRoot -Parent) "db"

Write-Host "DB가 준비될 때까지 대기..." -ForegroundColor Cyan
foreach ($i in 1..15) {
    docker exec $container pg_isready -U bottle -d bottle 2>$null | Out-Null
    if ($?) { break }
    Start-Sleep -Seconds 2
}

foreach ($file in @("01_schema.sql", "02_seed.sql")) {
    $local = Join-Path $dbDir $file
    Write-Host "적용 중: $file" -ForegroundColor Cyan
    docker cp $local "${container}:/tmp/$file"
    docker exec $container psql -U bottle -d bottle -v ON_ERROR_STOP=1 -f "/tmp/$file"
    if (-not $?) { throw "적용 실패: $file" }
}

Write-Host "`n완료. 적용 결과:" -ForegroundColor Green
docker exec $container psql -U bottle -d bottle -c "SELECT status, count(*) AS bottles FROM bottles GROUP BY status;"

# DB 초기화 스크립트 (Windows / PowerShell)
# 실행 중인 bottle_db 컨테이너에 스키마 + 시드를 적용한다.
#
#   docker compose up -d      # 먼저 컨테이너 기동
#   ./db/init-db.ps1          # 그 다음 이 스크립트 실행
#
# docker-entrypoint-initdb.d 바인드 마운트를 쓰지 않고 docker cp 로 복사 후 적용 →
# Google Drive 등 가상 드라이브에서도 안전하게 동작한다.

$ErrorActionPreference = "Stop"
$container = "bottle_db"
$scriptDir = $PSScriptRoot

Write-Host "DB가 준비될 때까지 대기..." -ForegroundColor Cyan
foreach ($i in 1..15) {
    docker exec $container pg_isready -U bottle -d bottle 2>$null | Out-Null
    if ($?) { break }
    Start-Sleep -Seconds 2
}

foreach ($file in @("01_schema.sql", "02_seed.sql")) {
    $local = Join-Path $scriptDir $file
    Write-Host "적용 중: $file" -ForegroundColor Cyan
    docker cp $local "${container}:/tmp/$file"
    docker exec $container psql -U bottle -d bottle -v ON_ERROR_STOP=1 -f "/tmp/$file"
    if (-not $?) { throw "적용 실패: $file" }
}

Write-Host "`n완료. 적용 결과:" -ForegroundColor Green
docker exec $container psql -U bottle -d bottle -c "SELECT status, count(*) AS bottles FROM bottles GROUP BY status;"

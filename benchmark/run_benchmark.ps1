# 유리병 편지 — 트랜잭션 벤치마크 실행기 (Windows / PowerShell)
#
#   ./benchmark/run_benchmark.ps1                # 기본 30초 측정
#   ./benchmark/run_benchmark.ps1 -Duration 60   # 60초 측정
#
# "병 줍기" 트랜잭션을 pgbench 로 측정한다.
#   격리수준: READ COMMITTED vs SERIALIZABLE
#   동시성  : 10 / 50 / 100 클라이언트
# pgbench 는 컨테이너 안에서 실행되므로 호스트에 별도 설치가 필요 없다.

param(
  [int]$Duration = 30
)
$ErrorActionPreference = "Stop"
$ct = "bottle_benchdb"
$dir = $PSScriptRoot
$resultDir = Join-Path $dir "results"
New-Item -ItemType Directory -Force -Path $resultDir | Out-Null

function Psql($sql) { docker exec $ct psql -U bench -d bench -v ON_ERROR_STOP=1 -t -A -c $sql }
function Reset { Psql "UPDATE bottles SET status='floating'; TRUNCATE pickups RESTART IDENTITY;" | Out-Null }

$concurrency = @(@{c=10; j=4}, @{c=50; j=8}, @{c=100; j=16})

function RunCase($label, $file) {
  $rows = @()
  foreach ($lv in $concurrency) {
    Reset
    $tag = "${label}_c$($lv.c)"
    Write-Host ("  - {0,-14} c={1,-3} j={2,-2} T={3}s ..." -f $label, $lv.c, $lv.j, $Duration) -NoNewline
    $out = (docker exec $ct pgbench -U bench -d bench -f "/tmp/$file" -n -c $lv.c -j $lv.j -T $Duration 2>&1) | Out-String
    $out | Set-Content (Join-Path $resultDir "$tag.txt")
    $tps  = if ($out -match "tps\s*=\s*([\d.]+)") { [math]::Round([double]$Matches[1], 1) } else { "?" }
    $lat  = if ($out -match "latency average\s*=\s*([\d.]+)\s*ms") { [math]::Round([double]$Matches[1], 3) } else { "?" }
    $fail = if ($out -match "number of failed transactions:\s*(\d+)") { $Matches[1] } else { "0" }
    Write-Host (" tps={0}  lat={1}ms  fail={2}" -f $tps, $lat, $fail) -ForegroundColor Green
    $rows += [pscustomobject]@{ isolation=$label; clients=$lv.c; tps=$tps; latency_ms=$lat; failed=$fail }
  }
  return $rows
}

Write-Host "[1/4] 벤치 DB 기동..." -ForegroundColor Cyan
docker compose -f (Join-Path $dir "docker-compose.yml") up -d | Out-Null
foreach ($i in 1..30) {
  docker exec $ct pg_isready -U bench -d bench 2>$null | Out-Null
  if ($?) { break }; Start-Sleep -Seconds 2
}

Write-Host "[2/4] 시드 확인/적용 (사용자 5만, 병 50만)..." -ForegroundColor Cyan
$cnt = (Psql "SELECT count(*) FROM bottles").Trim()
if ($cnt -eq "0") {
  docker cp (Join-Path $dir "seed.sql") "${ct}:/tmp/seed.sql"
  docker exec $ct psql -U bench -d bench -v ON_ERROR_STOP=1 -f /tmp/seed.sql
} else {
  Write-Host "  이미 시드됨(병 $cnt 개) — 건너뜀"
}

Write-Host "[3/4] 워크로드 복사..." -ForegroundColor Cyan
docker cp (Join-Path $dir "workloads\pick.sql") "${ct}:/tmp/pick.sql"
docker cp (Join-Path $dir "workloads\pick_serializable.sql") "${ct}:/tmp/pick_serializable.sql"

Write-Host "[4/4] 벤치마크 실행 (각 케이스 ${Duration}s)" -ForegroundColor Cyan
$summary = @()
Write-Host "=== READ COMMITTED ===" -ForegroundColor Yellow
$summary += RunCase "READ_COMMITTED" "pick.sql"
Write-Host "=== SERIALIZABLE ===" -ForegroundColor Yellow
$summary += RunCase "SERIALIZABLE" "pick_serializable.sql"

Write-Host "`n========== 결과 요약 ==========" -ForegroundColor Cyan
$summary | Format-Table -AutoSize
$summary | Export-Csv -Path (Join-Path $resultDir "summary.csv") -NoTypeInformation -Encoding UTF8
Write-Host "원시 결과: benchmark/results/*.txt, 요약: benchmark/results/summary.csv"

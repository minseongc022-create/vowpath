# Effiroad 배포 전 로컬 확인 (비밀값은 출력하지 않음)
Write-Host "=== Effiroad deploy checklist ===" -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
  Write-Host "[ ] git init 필요" -ForegroundColor Yellow
} else {
  Write-Host "[x] .git 존재" -ForegroundColor Green
}

$required = @(
  "NEXT_PUBLIC_BETA",
  "AUTH_SECRET",
  "OPENAI_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "TWILIO_DEFAULT_USER_ID",
  "JOBBER_CLIENT_ID",
  "JOBBER_CLIENT_SECRET"
)

if (Test-Path ".env.local") {
  $lines = Get-Content ".env.local" -Raw
  foreach ($key in $required) {
    if ($lines -match "(?m)^$key=.+") {
      Write-Host "[x] $key 설정됨" -ForegroundColor Green
    } else {
      Write-Host "[ ] $key 없음" -ForegroundColor Yellow
    }
  }
} else {
  Write-Host "[ ] .env.local 없음" -ForegroundColor Red
}

Write-Host ""
Write-Host "다음: git commit -> GitHub push -> vercel.com 배포 -> Upstash Redis" -ForegroundColor Cyan
Write-Host "자세히: DEPLOY.md" -ForegroundColor Gray

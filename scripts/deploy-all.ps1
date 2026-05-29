# Vowpath: GitHub push + Vercel deploy (로그인 후 한 번 실행)
# 사전: gh auth login  /  npx vercel login

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== 1. GitHub ===" -ForegroundColor Cyan
gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "먼저 실행: gh auth login" -ForegroundColor Red
  exit 1
}

$repo = "vowpath"
$owner = gh api user -q .login
$remote = "https://github.com/$owner/$repo.git"

if (-not (gh repo view "$owner/$repo" 2>$null)) {
  gh repo create $repo --private --source=. --remote=origin --push
} else {
  git push -u origin main
}

Write-Host "GitHub OK: https://github.com/$owner/$repo" -ForegroundColor Green

Write-Host "`n=== 2. Vercel login ===" -ForegroundColor Cyan
npx vercel whoami | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "먼저 실행: npx vercel login" -ForegroundColor Red
  exit 1
}

Write-Host "`n=== 3. Vercel deploy ===" -ForegroundColor Cyan
npx vercel link --yes 2>$null
npx vercel deploy --prod --yes

$url = npx vercel ls vowpath --yes 2>$null | Select-String "https://" | Select-Object -First 1
Write-Host "`n배포 후 Vercel Dashboard에서:" -ForegroundColor Yellow
Write-Host "  - Storage > Upstash Redis 연결"
Write-Host "  - Settings > Environment Variables (.env.local 복사)"
Write-Host "  - NEXT_PUBLIC_APP_URL = 배포 URL"
Write-Host "  - JOBBER_REDIRECT_URI = 배포URL/api/jobber/callback"
Write-Host "  - Redeploy"
Write-Host "  - 설정 > 웹훅 자동 등록"

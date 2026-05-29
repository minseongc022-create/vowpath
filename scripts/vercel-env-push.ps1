# Push .env.local to Vercel (production). Skips comments and tunnel URL.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$skip = @("TWILIO_WEBHOOK_BASE_URL", "NEXT_PUBLIC_APP_URL", "JOBBER_REDIRECT_URI")

Get-Content ".env.local" | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $i = $line.IndexOf("=")
  if ($i -lt 1) { return }
  $key = $line.Substring(0, $i).Trim()
  $val = $line.Substring($i + 1).Trim()
  if ($skip -contains $key) { return }
  if (-not $val) { return }
  Write-Host "env add $key"
  $val | npx vercel env add $key production --force --yes 2>&1 | Out-Null
}

Write-Host "Done. Set NEXT_PUBLIC_APP_URL and JOBBER_REDIRECT_URI after first deploy URL is known."

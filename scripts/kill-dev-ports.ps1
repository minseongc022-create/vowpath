# Stop Next.js dev servers bound to common local ports.
$ports = 3000, 3001, 3002, 3003
foreach ($port in $ports) {
  $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    if ($procId) {
      Write-Host "Stopping PID $procId (port $port)"
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
}
Write-Host "Done. Run: npm run dev:clean"

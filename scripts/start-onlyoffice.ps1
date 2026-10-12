# Demarre OnlyOffice pour l'edition Word des CV importes
$ErrorActionPreference = "Stop"
$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
if (Test-Path $dockerBin) {
  $env:PATH = "$dockerBin;" + $env:PATH
}

Write-Host "Verification Docker..."
docker info | Out-Null

Set-Location $PSScriptRoot\..
Write-Host "Demarrage OnlyOffice sur http://localhost:8082 ..."
docker compose -f docker-compose.onlyoffice.yml up -d

for ($i = 1; $i -le 30; $i++) {
  $code = curl.exe -sS -o NUL -w "%{http_code}" http://localhost:8082/healthcheck 2>$null
  if ($code -eq "200") {
    Write-Host "OnlyOffice pret (port 8082)."
    exit 0
  }
  Start-Sleep -Seconds 3
}

Write-Host "OnlyOffice demarre mais healthcheck pas encore OK — attendez 1-2 min."
exit 1

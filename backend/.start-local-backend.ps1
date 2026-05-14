$envFile = 'F:\pilates-studio-admin\backend\local-config'
Get-Content $envFile | Where-Object { $_ -and $_ -notmatch '^\s*#' } | ForEach-Object {
  $parts = $_.Split('=', 2)
  if ($parts.Length -eq 2) { [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process') }
}
Set-Location 'F:\pilates-studio-admin\backend'
node --enable-source-maps dist/src/main.js

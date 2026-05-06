# 愈己CareMe工作室 release readiness gate.
# This script checks local release configuration before production deployment.

param(
    [string]$AdminRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$MiniRoot = (Join-Path (Split-Path -Parent (Resolve-Path (Join-Path $PSScriptRoot "..")).Path) "pilates-studio-mini"),
    [string]$BackendEnvPath = "",
    [string]$MiniEnvPath = "",
    [string]$ApiBaseUrl = "",
    [switch]$AllowDirtyWorktree,
    [switch]$SkipGitCheck,
    [switch]$RunApiSmoke
)

$ErrorActionPreference = "Stop"
$script:Failures = @()
$script:Warnings = @()
$script:ManualChecks = @()

function Add-Failure {
    param([string]$Message)
    $script:Failures += $Message
}

function Add-Warning {
    param([string]$Message)
    $script:Warnings += $Message
}

function Add-Manual {
    param([string]$Message)
    $script:ManualChecks += $Message
}

function Read-EnvFile {
    param([string]$Path)

    $result = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $result
    }

    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
            return
        }

        $separatorIndex = $line.IndexOf("=")
        if ($separatorIndex -lt 1) {
            return
        }

        $key = $line.Substring(0, $separatorIndex).Trim()
        $value = $line.Substring($separatorIndex + 1).Trim().Trim("'").Trim('"')
        $result[$key] = $value
    }

    return $result
}

function Get-ConfigValue {
    param(
        [hashtable]$Values,
        [string]$Key
    )

    $envValue = [Environment]::GetEnvironmentVariable($Key)
    if (-not [string]::IsNullOrWhiteSpace($envValue)) {
        return $envValue
    }

    if ($Values.ContainsKey($Key)) {
        return [string]$Values[$Key]
    }

    return ""
}

function Assert-RequiredValue {
    param(
        [hashtable]$Values,
        [string]$Key,
        [string]$Context
    )

    $value = Get-ConfigValue -Values $Values -Key $Key
    if ([string]::IsNullOrWhiteSpace($value)) {
        Add-Failure "$Context requires $Key."
    }
    return $value
}

function Test-SecretValue {
    param(
        [string]$Value,
        [string]$Name
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        Add-Failure "$Name is missing."
        return
    }

    if ($Value.Length -lt 32) {
        Add-Failure "$Name must be at least 32 characters."
    }

    if ($Value -match "replace-with|your_|change-before-production|default|secret") {
        Add-Failure "$Name still looks like a placeholder."
    }
}

function Test-PlaceholderValue {
    param(
        [string]$Value,
        [string]$Name,
        [switch]$Required
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        if ($Required) {
            Add-Failure "$Name is missing."
        }
        return
    }

    if ($Value -match "replace-with|your_|yourdomain|example\.com|change-before-production|placeholder") {
        Add-Failure "$Name still looks like a placeholder."
    }
}

function Test-GitWorktree {
    param([string]$Root)

    if ($SkipGitCheck -or -not (Test-Path -LiteralPath (Join-Path $Root ".git"))) {
        return
    }

    $status = & git -C $Root status --porcelain
    if ($LASTEXITCODE -ne 0) {
        Add-Warning "Could not inspect git status for $Root."
        return
    }

    if (-not $AllowDirtyWorktree -and $status) {
        Add-Failure "Git worktree is dirty: $Root. Commit or explicitly pass -AllowDirtyWorktree for local rehearsal."
    }
}

function Test-BuildArtifact {
    param(
        [string]$Path,
        [string]$Name
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        Add-Warning "$Name build artifact is missing: $Path."
    }
}

Write-Host "愈己CareMe工作室 release readiness check" -ForegroundColor Cyan
Write-Host "Admin root: $AdminRoot"
Write-Host "Mini root:  $MiniRoot"

if ([string]::IsNullOrWhiteSpace($BackendEnvPath)) {
    $composeEnv = Join-Path $AdminRoot ".env"
    $candidateBackendEnv = Join-Path $AdminRoot "backend\.env"
    $fallbackBackendEnv = Join-Path $AdminRoot "backend\local.env"
    $BackendEnvPath = if (Test-Path -LiteralPath $composeEnv) {
        $composeEnv
    } elseif (Test-Path -LiteralPath $candidateBackendEnv) {
        $candidateBackendEnv
    } else {
        $fallbackBackendEnv
    }
}

if ([string]::IsNullOrWhiteSpace($MiniEnvPath)) {
    $MiniEnvPath = Join-Path $MiniRoot ".env"
}

Test-GitWorktree -Root $AdminRoot
if (Test-Path -LiteralPath $MiniRoot) {
    Test-GitWorktree -Root $MiniRoot
} else {
    Add-Failure "Mini program repository not found: $MiniRoot."
}

$backendEnv = Read-EnvFile -Path $BackendEnvPath
if (-not (Test-Path -LiteralPath $BackendEnvPath)) {
    Add-Failure "Backend/compose production env file not found. Pass -BackendEnvPath or create .env from production.env.example."
} else {
    Write-Host "Backend env: $BackendEnvPath"
}

$miniEnv = Read-EnvFile -Path $MiniEnvPath
if (-not (Test-Path -LiteralPath $MiniEnvPath)) {
    Add-Failure "Mini program env file not found. Pass -MiniEnvPath or create .env in the mini repo."
} else {
    Write-Host "Mini env:    $MiniEnvPath"
}

if ($backendEnv.Count -gt 0) {
    if ($backendEnv.ContainsKey("MYSQL_ROOT_PASSWORD") -or $backendEnv.ContainsKey("MYSQL_PASSWORD")) {
        Test-SecretValue -Value (Get-ConfigValue -Values $backendEnv -Key "MYSQL_ROOT_PASSWORD") -Name "MYSQL_ROOT_PASSWORD"
        Test-SecretValue -Value (Get-ConfigValue -Values $backendEnv -Key "MYSQL_PASSWORD") -Name "MYSQL_PASSWORD"
    }

    $nodeEnv = Get-ConfigValue -Values $backendEnv -Key "NODE_ENV"
    if ($nodeEnv -ne "production") {
        Add-Failure "Backend NODE_ENV must be production for release."
    }

    $databaseUrl = Assert-RequiredValue -Values $backendEnv -Key "DATABASE_URL" -Context "Backend"
    if ($databaseUrl -and $databaseUrl -notmatch "^mysql:\/\/") {
        Add-Warning "DATABASE_URL does not look like a MySQL URL."
    }

    Test-SecretValue -Value (Get-ConfigValue -Values $backendEnv -Key "JWT_ACCESS_SECRET") -Name "JWT_ACCESS_SECRET"
    Test-SecretValue -Value (Get-ConfigValue -Values $backendEnv -Key "JWT_REFRESH_SECRET") -Name "JWT_REFRESH_SECRET"

    $corsOrigins = Assert-RequiredValue -Values $backendEnv -Key "CORS_ORIGINS" -Context "Backend"
    if ($corsOrigins -match "\*" -or $corsOrigins -match "localhost|127\.0\.0\.1") {
        Add-Failure "CORS_ORIGINS must use only production HTTPS origins."
    }
    Test-PlaceholderValue -Value $corsOrigins -Name "CORS_ORIGINS" -Required

    $wechatAppId = Get-ConfigValue -Values $backendEnv -Key "WECHAT_APPID"
    $wechatSecret = Get-ConfigValue -Values $backendEnv -Key "WECHAT_SECRET"
    if ([string]::IsNullOrWhiteSpace($wechatAppId) -or [string]::IsNullOrWhiteSpace($wechatSecret)) {
        Add-Warning "WeChat login is not fully configured in backend env."
    }
    Test-PlaceholderValue -Value $wechatAppId -Name "WECHAT_APPID"
    Test-PlaceholderValue -Value $wechatSecret -Name "WECHAT_SECRET"

    $wechatPayEnabled = Get-ConfigValue -Values $backendEnv -Key "WECHAT_PAY_ENABLED"
    $wechatPayMock = Get-ConfigValue -Values $backendEnv -Key "WECHAT_PAY_MOCK"
    if ($wechatPayEnabled -eq "true") {
        if ($wechatPayMock -eq "true") {
            Add-Failure "WECHAT_PAY_MOCK must be false when WECHAT_PAY_ENABLED is true."
        }

        @(
            "WECHAT_PAY_MCH_ID",
            "WECHAT_PAY_MERCHANT_SERIAL_NO",
            "WECHAT_PAY_API_V3_KEY",
            "WECHAT_PAY_PRIVATE_KEY",
            "WECHAT_PAY_PLATFORM_PUBLIC_KEY",
            "WECHAT_PAY_NOTIFY_URL"
        ) | ForEach-Object {
            Assert-RequiredValue -Values $backendEnv -Key $_ -Context "WeChat Pay" | Out-Null
        }

        $notifyUrl = Get-ConfigValue -Values $backendEnv -Key "WECHAT_PAY_NOTIFY_URL"
        if ($notifyUrl -and $notifyUrl -notmatch "^https://") {
            Add-Failure "WECHAT_PAY_NOTIFY_URL must be HTTPS."
        }
        Test-PlaceholderValue -Value $notifyUrl -Name "WECHAT_PAY_NOTIFY_URL" -Required
    } else {
        Add-Warning "WECHAT_PAY_ENABLED is not true. This is acceptable only for offline/manual payment launch."
    }
}

if ($miniEnv.Count -gt 0) {
    $appEnv = Get-ConfigValue -Values $miniEnv -Key "APP_ENV"
    $miniRelease = Get-ConfigValue -Values $miniEnv -Key "MINI_RELEASE"
    if ($appEnv -ne "production" -and $miniRelease -ne "true") {
        Add-Failure "Mini program must set APP_ENV=production or MINI_RELEASE=true."
    }

    $apiBase = Assert-RequiredValue -Values $miniEnv -Key "API_BASE_URL" -Context "Mini program"
    if ($apiBase -notmatch "^https://") {
        Add-Failure "Mini program API_BASE_URL must be HTTPS."
    }
    if ($apiBase -match "localhost|127\.0\.0\.1") {
        Add-Failure "Mini program API_BASE_URL must not use localhost or 127.0.0.1."
    }
    Test-PlaceholderValue -Value $apiBase -Name "Mini program API_BASE_URL" -Required

    if ((Get-ConfigValue -Values $miniEnv -Key "ALLOW_INSECURE_REAL_DEVICE_API") -eq "true") {
        Add-Failure "ALLOW_INSECURE_REAL_DEVICE_API must be false for release."
    }

    if ((Get-ConfigValue -Values $miniEnv -Key "USE_MINI_OPEN_ID_LOGIN") -eq "true") {
        Add-Failure "USE_MINI_OPEN_ID_LOGIN must be false for release."
    }

    $supportPhone = Assert-RequiredValue -Values $miniEnv -Key "SUPPORT_PHONE" -Context "Mini program"
    $supportEmail = Assert-RequiredValue -Values $miniEnv -Key "SUPPORT_EMAIL" -Context "Mini program"
    Test-PlaceholderValue -Value $supportPhone -Name "SUPPORT_PHONE" -Required
    Test-PlaceholderValue -Value $supportEmail -Name "SUPPORT_EMAIL" -Required

    $projectConfigPath = Join-Path $MiniRoot "project.config.json"
    if (Test-Path -LiteralPath $projectConfigPath) {
        $projectConfig = Get-Content -LiteralPath $projectConfigPath -Raw | ConvertFrom-Json
        if ([string]::IsNullOrWhiteSpace($projectConfig.appid) -or $projectConfig.appid -match "tourist|test") {
            Add-Failure "Mini program project.config.json must use the production AppID."
        }
    } else {
        Add-Failure "Mini program project.config.json is missing."
    }
}

$nginxConf = Join-Path $AdminRoot "nginx.conf"
if (Test-Path -LiteralPath $nginxConf) {
    $nginxText = Get-Content -LiteralPath $nginxConf -Raw
    if ($nginxText -match "server_name\s+localhost") {
        Add-Warning "nginx.conf still uses server_name localhost. Replace it or terminate TLS with an external proxy."
    }
}

$composeFile = Join-Path $AdminRoot "docker-compose.yml"
if (Test-Path -LiteralPath $composeFile) {
    $composeText = Get-Content -LiteralPath $composeFile -Raw
    if ($composeText -match '"3306:3306"') {
        Add-Warning "docker-compose.yml publishes MySQL on host port 3306. Restrict firewall or remove public binding in production."
    }
}

Test-BuildArtifact -Path (Join-Path $AdminRoot "dist\index.html") -Name "Admin frontend"
Test-BuildArtifact -Path (Join-Path $AdminRoot "backend\dist") -Name "Backend"
Test-BuildArtifact -Path (Join-Path $MiniRoot "dist\app.json") -Name "Mini program"

Add-Manual "Verify HTTPS certificates and WeChat request domain whitelist in the WeChat console."
Add-Manual "Run prisma migrate deploy against production after a verified database backup."
Add-Manual "Create or verify the first production OWNER admin and rotate the seed password after launch."
Add-Manual "Run real-device mini program smoke tests, including login, booking, cancellation, payment, and profile flows."
Add-Manual "Confirm rollback package, database backup path, and rollback owner before release."

if ($RunApiSmoke) {
    if ([string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
        Add-Failure "-RunApiSmoke requires -ApiBaseUrl."
    } else {
        $apiSmokeScript = Join-Path $AdminRoot "scripts\test-api.ps1"
        if (-not (Test-Path -LiteralPath $apiSmokeScript)) {
            Add-Failure "API smoke script not found: $apiSmokeScript."
        } else {
            Write-Host "Running API smoke against $ApiBaseUrl" -ForegroundColor Cyan
            & powershell -ExecutionPolicy Bypass -File $apiSmokeScript -BaseUrl $ApiBaseUrl
            if ($LASTEXITCODE -ne 0) {
                Add-Failure "API smoke test failed."
            }
        }
    }
}

Write-Host ""
Write-Host "Release readiness result" -ForegroundColor Cyan

if ($script:Failures.Count -gt 0) {
    Write-Host "Blockers:" -ForegroundColor Red
    $script:Failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

if ($script:Warnings.Count -gt 0) {
    Write-Host "Warnings:" -ForegroundColor Yellow
    $script:Warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}

if ($script:ManualChecks.Count -gt 0) {
    Write-Host "Manual checks:" -ForegroundColor Cyan
    $script:ManualChecks | ForEach-Object { Write-Host "  - $_" }
}

if ($script:Failures.Count -gt 0) {
    exit 1
}

Write-Host "No automated blockers found. Complete manual checks before launch." -ForegroundColor Green
exit 0

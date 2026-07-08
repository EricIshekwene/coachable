[CmdletBinding()]
param(
    [string]$Service = "resplendent-inspiration",
    [string]$Environment = "production",
    [string]$Project = "8fcd0561-9409-4f95-86cc-2ee5e581fe23",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$stageRoot = Join-Path $env:TEMP "coachable-railway-server-$PID"
$archivePath = Join-Path $env:TEMP "coachable-railway-server-$PID.zip"
$tempRoot = [IO.Path]::GetFullPath($env:TEMP)
$resolvedStage = [IO.Path]::GetFullPath($stageRoot)

if (-not $resolvedStage.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe staging path: $resolvedStage"
}

try {
    $serverChanges = git -C $repoRoot status --porcelain -- server
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inspect the server working tree."
    }
    if ($serverChanges) {
        throw "The server tree has uncommitted changes. Commit them before deploying."
    }

    git -C $repoRoot archive --format=zip --output=$archivePath HEAD server
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create the server deployment archive."
    }

    Expand-Archive -LiteralPath $archivePath -DestinationPath $resolvedStage

    foreach ($requiredFile in @("server\index.js", "server\package.json", "server\package-lock.json")) {
        if (-not (Test-Path -LiteralPath (Join-Path $resolvedStage $requiredFile))) {
            throw "Deployment archive is missing $requiredFile."
        }
    }

    if ($DryRun) {
        Write-Host "Railway archive verified at $resolvedStage"
        return
    }

    & railway.cmd up $resolvedStage --path-as-root --project $Project --environment $Environment --service $Service
    if ($LASTEXITCODE -ne 0) {
        throw "Railway deployment upload failed."
    }
}
finally {
    if (Test-Path -LiteralPath $resolvedStage) {
        Remove-Item -LiteralPath $resolvedStage -Recurse -Force
    }
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
}

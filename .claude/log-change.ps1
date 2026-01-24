# Claude Code Changelog Logger
# This script logs file changes made during Claude sessions

param(
    [string]$FilePath,
    [string]$Tool
)

$changelogPath = "$PSScriptRoot\..\CHANGELOG.md"
$sessionLogPath = "$PSScriptRoot\session-changes.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$relativePath = $FilePath -replace [regex]::Escape((Get-Location).Path + "\"), "" -replace "\\", "/"

# Create session log if it doesn't exist
if (-not (Test-Path $sessionLogPath)) {
    $sessionStart = Get-Date -Format "yyyy-MM-dd HH:mm"
    "# Claude Session Changes - $sessionStart`n" | Out-File -FilePath $sessionLogPath -Encoding UTF8
}

# Log the change
$entry = "- [$timestamp] ($Tool) $relativePath"
Add-Content -Path $sessionLogPath -Value $entry -Encoding UTF8

# Output for hook feedback
Write-Host "Logged: $relativePath"

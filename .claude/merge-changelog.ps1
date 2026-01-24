# Merge session changes into CHANGELOG.md
# Run this at the end of a Claude session to update the changelog

$sessionLogPath = "$PSScriptRoot\session-changes.log"
$changelogPath = "$PSScriptRoot\..\CHANGELOG.md"

if (-not (Test-Path $sessionLogPath)) {
    Write-Host "No session changes to merge."
    exit 0
}

# Read files
$sessionChanges = Get-Content $sessionLogPath -Raw
$changelog = Get-Content $changelogPath -Raw

# Find the [Unreleased] section and insert after it
$insertPoint = "## [Unreleased]"
$newSection = @"
## [Unreleased]

### Claude Session Changes
$sessionChanges
"@

$updatedChangelog = $changelog -replace [regex]::Escape($insertPoint), $newSection

# Write updated changelog
$updatedChangelog | Out-File -FilePath $changelogPath -Encoding UTF8 -NoNewline

# Archive the session log
$archiveName = "session-changes-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
Move-Item $sessionLogPath "$PSScriptRoot\$archiveName"

Write-Host "Changelog updated! Session log archived as $archiveName"

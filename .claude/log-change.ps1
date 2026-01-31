# Log file changes for changelog tracking
# Receives tool input as JSON from stdin

param()

$input = [Console]::In.ReadToEnd()

try {
    $json = $input | ConvertFrom-Json
    $filePath = $json.tool_input.file_path
    $toolName = $json.tool_name

    if (-not $filePath) {
        exit 0
    }

    # Only log code files
    if ($filePath -notmatch '\.(js|jsx|json|css)$') {
        exit 0
    }

    $sessionLogPath = "$PSScriptRoot\session-changes.txt"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    # Get relative path
    $projectDir = Split-Path $PSScriptRoot -Parent
    $relativePath = $filePath -replace [regex]::Escape($projectDir), "" -replace "^[\\/]", "" -replace "\\", "/"

    # Create session log if it doesn't exist
    if (-not (Test-Path $sessionLogPath)) {
        $sessionStart = Get-Date -Format "yyyy-MM-dd HH:mm"
        "# Claude Session Changes - $sessionStart`n" | Out-File -FilePath $sessionLogPath -Encoding UTF8
    }

    # Log the change
    $entry = "- [$timestamp] ($toolName) $relativePath"
    Add-Content -Path $sessionLogPath -Value $entry -Encoding UTF8

} catch {
    exit 0
}

exit 0

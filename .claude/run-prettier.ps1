# Run Prettier on edited/written files
# Receives tool input as JSON from stdin

param()

# Read JSON from stdin
$input = [Console]::In.ReadToEnd()

try {
    $json = $input | ConvertFrom-Json

    # Extract file path from tool input (Edit and Write tools use file_path)
    $filePath = $json.tool_input.file_path

    if (-not $filePath) {
        exit 0
    }

    # Only format JS/JSX files in src/ or workers/
    if ($filePath -match '\.(js|jsx)$' -and ($filePath -match '[\\/]src[\\/]' -or $filePath -match '[\\/]workers[\\/]')) {
        Write-Host "Formatting: $filePath"
        npx prettier --write $filePath 2>$null
    }
} catch {
    # Silently exit on parse errors
    exit 0
}

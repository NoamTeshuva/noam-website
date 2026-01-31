# Run ESLint on edited/written source files
# Receives tool input as JSON from stdin

param()

$input = [Console]::In.ReadToEnd()

try {
    $json = $input | ConvertFrom-Json
    $filePath = $json.tool_input.file_path

    if (-not $filePath) {
        exit 0
    }

    # Only lint JS/JSX files in src/
    if ($filePath -match '\.(js|jsx)$' -and $filePath -match '[\\/]src[\\/]') {
        Write-Host "`n=== ESLint Check ===" -ForegroundColor Cyan
        npx eslint $filePath --max-warnings 5 --format stylish 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ESLint found issues (non-blocking)" -ForegroundColor Yellow
        }
    }
} catch {
    exit 0
}

# Always exit 0 so it doesn't block
exit 0

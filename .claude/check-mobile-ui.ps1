# Mobile UI Responsiveness Checker for Tailwind CSS projects
# Receives tool input as JSON from stdin

param()

$input = [Console]::In.ReadToEnd()

try {
    $json = $input | ConvertFrom-Json
    $FilePath = $json.tool_input.file_path

    if (-not $FilePath) {
        exit 0
    }

    # Only check pages and components
    if ($FilePath -notmatch '[\\/]src[\\/](pages|components)[\\/].*\.jsx$') {
        exit 0
    }
} catch {
    exit 0
}

$issues = @()
$warnings = @()

if (-not (Test-Path $FilePath)) {
    exit 0
}

$content = Get-Content $FilePath -Raw
$fileName = Split-Path $FilePath -Leaf

# Skip if file is too small
if ($content.Length -lt 100) {
    exit 0
}

# Check 1: Fixed widths without responsive variants
$fixedWidths = [regex]::Matches($content, '\b(w-\d{3,}|w-\[\d+px\])\b(?!\s+[sm|md|lg|xl]:)')
if ($fixedWidths.Count -gt 0) {
    $issues += "Fixed large widths found (may overflow on mobile): $($fixedWidths.Value -join ', ')"
}

# Check 2: Hardcoded pixel values in style attributes
$inlinePixels = [regex]::Matches($content, 'style=\{[^}]*width:\s*[''"]?\d{4,}px')
if ($inlinePixels.Count -gt 0) {
    $issues += "Inline styles with large pixel widths detected"
}

# Check 3: Grid without responsive columns
$gridNoResponsive = [regex]::Matches($content, 'grid-cols-[3-9](?!\s|.*[sm|md|lg]:grid-cols)')
if ($gridNoResponsive.Count -gt 0) {
    $warnings += "Grid with 3+ columns without responsive variant - consider adding sm:grid-cols-1"
}

# Check 4: Flex row without wrap or responsive stack
$flexNoWrap = [regex]::Matches($content, 'flex\s+(?:flex-row\s+)?(?!.*flex-wrap)(?!.*flex-col).*gap-')
if ($flexNoWrap.Count -gt 0) {
    $warnings += "Flex container without wrap - consider flex-wrap or md:flex-row flex-col"
}

# Check 5: Text sizes that might be too large on mobile
$largeText = [regex]::Matches($content, '\btext-[4-9]xl\b(?!\s+[sm|md|lg|xl]:)')
if ($largeText.Count -gt 0) {
    $warnings += "Large text sizes without responsive variants: $($largeText.Value -join ', ')"
}

# Check 6: Horizontal padding/margin that might cause overflow
$largePadding = [regex]::Matches($content, '\b[pm]x-(\d{2,}|\[\d{3,}px\])\b(?!\s+[sm|md|lg|xl]:)')
if ($largePadding.Count -gt 0) {
    $warnings += "Large horizontal padding/margin without responsive variant"
}

# Check 7: Tables without overflow handling
if ($content -match '<table' -and $content -notmatch 'overflow-x-auto|overflow-auto|overflow-scroll') {
    $warnings += "Table without overflow wrapper - may cause horizontal scroll on mobile"
}

# Output results
if ($issues.Count -gt 0 -or $warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "=== Mobile UI Check: $fileName ===" -ForegroundColor Cyan

    if ($issues.Count -gt 0) {
        Write-Host ""
        Write-Host "ISSUES:" -ForegroundColor Red
        foreach ($issue in $issues) {
            Write-Host "  - $issue" -ForegroundColor Red
        }
    }

    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "WARNINGS:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "TIP: Use responsive prefixes (sm:, md:, lg:) for mobile-friendly layouts" -ForegroundColor Gray
    Write-Host ""
}

exit 0

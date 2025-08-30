# Clean Android build artifacts
# This script cleans all Android build artifacts and temporary files

$AndroidFramework = $PSScriptRoot | Split-Path -Parent
$ProjectRoot = $AndroidFramework | Split-Path -Parent

Write-Host " Cleaning Android build artifacts..." -ForegroundColor Cyan

# Change to android framework directory
Set-Location $AndroidFramework

$CleanItems = @(
    "android\app\build",
    "android\build", 
    "android\.gradle",
    "android\app\src\main\assets\public",
    "node_modules\.cache",
    ".capacitor"
)

foreach ($Item in $CleanItems) {
    $FullPath = Join-Path $AndroidFramework $Item
    if (Test-Path $FullPath) {
        Write-Host "     Removing: $Item" -ForegroundColor Yellow
        Remove-Item $FullPath -Recurse -Force -ErrorAction SilentlyContinue
        if (!(Test-Path $FullPath)) {
            Write-Host "    Removed: $Item" -ForegroundColor Green
        } else {
            Write-Host "     Partially removed: $Item" -ForegroundColor Yellow
        }
    } else {
        Write-Host "    Not found: $Item" -ForegroundColor Gray
    }
}

# Clean Gradle cache
Write-Host "    Cleaning Gradle cache..." -ForegroundColor Blue
Set-Location "android"
try {
    .\gradlew clean
    Write-Host "    Gradle clean completed" -ForegroundColor Green
} catch {
    Write-Host "     Gradle clean failed or not needed" -ForegroundColor Yellow
}

# Return to project root
Set-Location $ProjectRoot

Write-Host ""
Write-Host " Android cleanup completed!" -ForegroundColor Green


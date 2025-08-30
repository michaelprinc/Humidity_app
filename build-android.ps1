# Humidity App - Android APK Builder
# Main script to build Android APK from React app

param(
    [switch]$Debug,
    [switch]$Release,
    [switch]$Clean,
    [string]$OutputName = ""
)

# APK Verification Function
function Test-ApkIntegrity {
    param($ApkPath)
    
    try {
        # Try to find aapt in Android SDK
        $AaptPaths = @(
            "$env:ANDROID_HOME\build-tools\34.0.0\aapt.exe",
            "$env:ANDROID_HOME\build-tools\33.0.1\aapt.exe",
            "$env:ANDROID_HOME\build-tools\33.0.0\aapt.exe",
            "$env:ANDROID_HOME\build-tools\32.0.0\aapt.exe"
        )
        
        foreach ($AaptPath in $AaptPaths) {
            if (Test-Path $AaptPath) {
                $result = & $AaptPath dump badging $ApkPath 2>&1
                if ($LASTEXITCODE -eq 0) {
                    return $true
                }
                break
            }
        }
        
        # If aapt not found, just check file integrity
        $fileInfo = Get-Item $ApkPath
        if ($fileInfo.Length -gt 1MB) {
            return $true
        }
    } catch {
        # Verification failed, but APK might still be valid
        return $false
    }
    return $false
}

# Configuration
$AppName = "HumidityApp"
$ProjectRoot = $PSScriptRoot
$AndroidFramework = Join-Path $ProjectRoot "android-framework"
$ApksFolder = Join-Path $ProjectRoot "apks"
$DistFolder = Join-Path $ProjectRoot "dist"

# Set correct JAVA_HOME if not set properly
$JavaPaths = @(
    "C:\Program Files\Java\jdk-17",
    "C:\Program Files\Java\jdk-11",
    "C:\Program Files\Eclipse Adoptium\jdk-17",
    "C:\Program Files\Eclipse Adoptium\jdk-11"
)

foreach ($JavaPath in $JavaPaths) {
    if (Test-Path $JavaPath) {
        $env:JAVA_HOME = $JavaPath
        Write-Host "Set JAVA_HOME to: $JavaPath" -ForegroundColor Yellow
        break
    }
}

# Ensure required folders exist
if (!(Test-Path $ApksFolder)) {
    New-Item -ItemType Directory -Path $ApksFolder -Force
}

# Generate timestamp for APK naming
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BuildType = if ($Release) { "release" } else { "debug" }

if ($OutputName -eq "") {
    $ApkName = "${AppName}-${BuildType}-${Timestamp}.apk"
} else {
    $ApkName = "${OutputName}-${BuildType}-${Timestamp}.apk"
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Humidity App - Android APK Builder" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Build Type: $BuildType" -ForegroundColor Yellow
Write-Host "Output APK: $ApkName" -ForegroundColor Yellow
Write-Host "Timestamp: $Timestamp" -ForegroundColor Yellow
Write-Host ""

# Step 1: Clean previous builds if requested
if ($Clean) {
    Write-Host "Cleaning previous builds..." -ForegroundColor Blue
    if (Test-Path $DistFolder) {
        Remove-Item $DistFolder -Recurse -Force
        Write-Host "   Removed dist folder" -ForegroundColor Green
    }
    if (Test-Path (Join-Path $AndroidFramework "android\app\src\main\assets\public")) {
        Remove-Item (Join-Path $AndroidFramework "android\app\src\main\assets\public") -Recurse -Force
        Write-Host "   Removed Android assets" -ForegroundColor Green
    }
}

# Step 2: Build React app
Write-Host "Building React application..." -ForegroundColor Blue
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "React build failed"
    }
    Write-Host "   React build completed successfully" -ForegroundColor Green
} catch {
    Write-Host "   React build failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Initialize Capacitor project if not exists
$CapacitorConfig = Join-Path $AndroidFramework "capacitor.config.ts"
if (!(Test-Path $CapacitorConfig)) {
    Write-Host " Initializing Capacitor Android framework..." -ForegroundColor Blue
    & "$AndroidFramework\scripts\init-capacitor.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    Capacitor initialization failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "    Capacitor framework initialized" -ForegroundColor Green
}

# Step 4: Copy web assets to Android project
Write-Host " Copying web assets to Android project..." -ForegroundColor Blue
try {
    Set-Location $AndroidFramework
    npx cap copy android
    if ($LASTEXITCODE -ne 0) {
        throw "Capacitor copy failed"
    }
    Write-Host "    Assets copied successfully" -ForegroundColor Green
} catch {
    Write-Host "    Asset copy failed: $_" -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}

# Step 5: Sync Capacitor
Write-Host " Syncing Capacitor..." -ForegroundColor Blue
try {
    npx cap sync android
    if ($LASTEXITCODE -ne 0) {
        throw "Capacitor sync failed"
    }
    Write-Host "    Capacitor sync completed" -ForegroundColor Green
} catch {
    Write-Host "    Capacitor sync failed: $_" -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}

# Step 6: Build Android APK
Write-Host " Building Android APK..." -ForegroundColor Blue
try {
    Set-Location (Join-Path $AndroidFramework "android")
    
    if ($Release) {
        .\gradlew assembleRelease
        $BuiltApkPath = "app\build\outputs\apk\release\app-release.apk"
    } else {
        .\gradlew assembleDebug
        $BuiltApkPath = "app\build\outputs\apk\debug\app-debug.apk"
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle build failed"
    }
    Write-Host "    Android build completed" -ForegroundColor Green
} catch {
    Write-Host "    Android build failed: $_" -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}

# Step 7: Copy and rename APK
Write-Host " Finalizing APK..." -ForegroundColor Blue
try {
    $SourceApk = Join-Path (Join-Path $AndroidFramework "android") $BuiltApkPath
    $DestApk = Join-Path $ApksFolder $ApkName
    
    if (Test-Path $SourceApk) {
        Copy-Item $SourceApk $DestApk -Force
        Write-Host "    APK saved to: $DestApk" -ForegroundColor Green
        
        # Get APK size
        $ApkSize = [math]::Round((Get-Item $DestApk).Length / 1MB, 2)
        Write-Host "    APK size: ${ApkSize} MB" -ForegroundColor Green
        
        # Verify APK integrity
        Write-Host "    Verifying APK integrity..." -ForegroundColor Blue
        if (Test-ApkIntegrity $DestApk) {
            Write-Host "    APK verification successful" -ForegroundColor Green
        } else {
            Write-Host "    APK verification failed - manual testing recommended" -ForegroundColor Yellow
        }
    } else {
        throw "Built APK not found at $SourceApk"
    }
} catch {
    Write-Host "    APK finalization failed: $_" -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}

# Return to project root
Set-Location $ProjectRoot

# Step 8: Success summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " BUILD COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "APK Location: $DestApk" -ForegroundColor Yellow
Write-Host "APK Size: ${ApkSize} MB" -ForegroundColor Yellow
Write-Host "Build Type: $BuildType" -ForegroundColor Yellow
Write-Host "Timestamp: $Timestamp" -ForegroundColor Yellow
Write-Host ""
Write-Host "Installation Options:" -ForegroundColor Cyan
Write-Host "1. ADB Install (Recommended): adb install `"$DestApk`"" -ForegroundColor White
Write-Host "2. Manual Install: Copy APK to device and install" -ForegroundColor White
Write-Host "3. For Android 13+: Ensure Developer Options enabled" -ForegroundColor White

# Optional: Open APKs folder
$OpenFolder = Read-Host "Open APKs folder? (y/n)"
if ($OpenFolder -eq "y" -or $OpenFolder -eq "Y") {
    Invoke-Item $ApksFolder
}

Write-Host ""
Write-Host " Your Humidity App is ready for Android!" -ForegroundColor Cyan


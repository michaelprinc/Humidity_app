# Android APK Testing Script
# This script helps test APK installation on Android devices

param(
    [string]$ApkPath = "",
    [switch]$ListDevices,
    [switch]$CheckAdb
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Android APK Testing Helper" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Function to find ADB
function Find-Adb {
    $AdbPaths = @(
        "$env:ANDROID_HOME\platform-tools\adb.exe",
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe"
    )
    
    foreach ($Path in $AdbPaths) {
        if (Test-Path $Path) {
            return $Path
        }
    }
    
    # Try to find in PATH
    try {
        $AdbCmd = Get-Command adb -ErrorAction SilentlyContinue
        if ($AdbCmd) {
            return $AdbCmd.Source
        }
    } catch {}
    
    return $null
}

# Check ADB installation
if ($CheckAdb) {
    Write-Host "Checking ADB installation..." -ForegroundColor Blue
    $AdbPath = Find-Adb
    if ($AdbPath) {
        Write-Host "   ADB found at: $AdbPath" -ForegroundColor Green
        & $AdbPath version
    } else {
        Write-Host "   ADB not found. Please install Android SDK Platform Tools" -ForegroundColor Red
        Write-Host "   Download: https://developer.android.com/studio/releases/platform-tools" -ForegroundColor Yellow
    }
    return
}

# List connected devices
if ($ListDevices) {
    Write-Host "Checking connected Android devices..." -ForegroundColor Blue
    $AdbPath = Find-Adb
    if ($AdbPath) {
        & $AdbPath devices
    } else {
        Write-Host "   ADB not found" -ForegroundColor Red
    }
    return
}

# Install APK
if ($ApkPath -eq "") {
    # Find latest APK
    $LatestApk = Get-ChildItem "apks\*.apk" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($LatestApk) {
        $ApkPath = $LatestApk.FullName
        Write-Host "Using latest APK: $($LatestApk.Name)" -ForegroundColor Yellow
    } else {
        Write-Host "No APK found in apks folder" -ForegroundColor Red
        return
    }
}

# Verify APK exists
if (!(Test-Path $ApkPath)) {
    Write-Host "APK not found: $ApkPath" -ForegroundColor Red
    return
}

Write-Host "Testing APK: $ApkPath" -ForegroundColor Green
$ApkSize = [math]::Round((Get-Item $ApkPath).Length / 1MB, 2)
Write-Host "APK Size: ${ApkSize} MB" -ForegroundColor Yellow

# Find ADB
$AdbPath = Find-Adb
if (!$AdbPath) {
    Write-Host ""
    Write-Host "ADB not found. Manual installation instructions:" -ForegroundColor Yellow
    Write-Host "1. Enable Developer Options on your Android device" -ForegroundColor White
    Write-Host "2. Enable 'Install via USB' or 'Unknown Sources'" -ForegroundColor White
    Write-Host "3. Copy APK to device Downloads folder" -ForegroundColor White
    Write-Host "4. Use file manager to locate and install APK" -ForegroundColor White
    Write-Host ""
    Write-Host "For Android 13+:" -ForegroundColor Cyan
    Write-Host "- Go to Settings > Apps > Special app access > Install unknown apps" -ForegroundColor White
    Write-Host "- Enable for your file manager app" -ForegroundColor White
    return
}

# Check connected devices
Write-Host ""
Write-Host "Checking connected devices..." -ForegroundColor Blue
$DevicesOutput = & $AdbPath devices
Write-Host $DevicesOutput

if ($DevicesOutput -match "device$") {
    Write-Host ""
    Write-Host "Device found! Attempting installation..." -ForegroundColor Green
    
    # Try to install
    Write-Host "Installing APK..." -ForegroundColor Blue
    $InstallResult = & $AdbPath install -r $ApkPath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   APK installed successfully!" -ForegroundColor Green
        Write-Host "   You can now find 'Humidity App' in your app drawer" -ForegroundColor Yellow
    } else {
        Write-Host "   Installation failed:" -ForegroundColor Red
        Write-Host "   $InstallResult" -ForegroundColor Yellow
        
        Write-Host ""
        Write-Host "Troubleshooting steps:" -ForegroundColor Cyan
        Write-Host "1. Enable Developer Options and USB Debugging" -ForegroundColor White
        Write-Host "2. Allow USB installation when prompted on device" -ForegroundColor White
        Write-Host "3. Try: adb uninstall com.humidity.app (if app exists)" -ForegroundColor White
        Write-Host "4. Try manual installation method" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "No devices found. Please:" -ForegroundColor Yellow
    Write-Host "1. Connect your Android device via USB" -ForegroundColor White
    Write-Host "2. Enable Developer Options" -ForegroundColor White
    Write-Host "3. Enable USB Debugging" -ForegroundColor White
    Write-Host "4. Allow USB debugging when prompted" -ForegroundColor White
}

Write-Host ""
Write-Host "For manual installation:" -ForegroundColor Cyan
Write-Host "Copy this file to your device: $ApkPath" -ForegroundColor White

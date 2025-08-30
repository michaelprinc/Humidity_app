# Initialize Capacitor Android Framework
# This script sets up the Capacitor Android project structure

$AndroidFramework = $PSScriptRoot | Split-Path -Parent
$ProjectRoot = $AndroidFramework | Split-Path -Parent

Write-Host " Initializing Capacitor Android Framework..." -ForegroundColor Cyan
Write-Host "Android Framework Path: $AndroidFramework" -ForegroundColor Yellow
Write-Host "Project Root: $ProjectRoot" -ForegroundColor Yellow
Write-Host ""

# Change to android framework directory
Set-Location $AndroidFramework

# Step 1: Install Capacitor dependencies
Write-Host "Installing Capacitor dependencies..." -ForegroundColor Blue
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Host "   Dependencies installed successfully" -ForegroundColor Green
}
catch {
    Write-Host "   Dependency installation failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Initialize Capacitor
Write-Host "Initializing Capacitor..." -ForegroundColor Blue
try {
    # Create capacitor config
    $CapacitorConfig = @"
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.humidity.app',
  appName: 'Humidity App',
  webDir: '../dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e40af',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e40af'
    },
    Geolocation: {
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION']
    },
    Network: {
      alias: 'network'
    }
  }
};

export default config;
"@
    
    Set-Content -Path "capacitor.config.ts" -Value $CapacitorConfig -Encoding UTF8
    Write-Host "   Capacitor config created" -ForegroundColor Green
}
catch {
    Write-Host "   Capacitor config creation failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Add Android platform
Write-Host "Adding Android platform..." -ForegroundColor Blue
try {
    npx cap add android
    if ($LASTEXITCODE -ne 0) {
        throw "Android platform addition failed"
    }
    Write-Host "   Android platform added successfully" -ForegroundColor Green
}
catch {
    Write-Host "   Android platform addition failed: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Configure Android manifest
Write-Host "Configuring Android manifest..." -ForegroundColor Blue
try {
    $ManifestPath = "android\app\src\main\AndroidManifest.xml"
    if (Test-Path $ManifestPath) {
        $ManifestContent = Get-Content $ManifestPath -Raw
        
        # Add permissions for humidity app features
        $Permissions = @'
    <!-- Humidity App Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />
'@
        
        # Insert permissions after the manifest opening tag
        $ManifestContent = $ManifestContent -replace '(<manifest[^>]*>)', ('$1' + "`n" + $Permissions)
        
        Set-Content -Path $ManifestPath -Value $ManifestContent -Encoding UTF8
        Write-Host "   Android manifest configured" -ForegroundColor Green
    }
    else {
        Write-Host "   Android manifest not found, skipping configuration" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   Android manifest configuration failed: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Create app icons and splash screens folder
Write-Host "Setting up app resources..." -ForegroundColor Blue
try {
    $ResourcesPath = "android\app\src\main\res"
    if (Test-Path $ResourcesPath) {
        # Create resources info file
        $ResourcesInfo = @'
# Android App Resources

This folder contains Android app resources including:
- App icons (mipmap folders)
- Splash screens (drawable folders)
- App colors and themes (values folders)

## To customize:
1. Replace icons in mipmap-* folders with your humidity app icons
2. Update splash screen in drawable folders
3. Modify colors.xml for your app theme

## Icon sizes needed:
- mipmap-mdpi: 48x48px
- mipmap-hdpi: 72x72px  
- mipmap-xhdpi: 96x96px
- mipmap-xxhdpi: 144x144px
- mipmap-xxxhdpi: 192x192px

## Splash screen:
- Place splash screen images in drawable folders
- Update splash_screen.xml if needed
'@
        Set-Content -Path (Join-Path $ResourcesPath "README.md") -Value $ResourcesInfo -Encoding UTF8
        Write-Host "   App resources folder prepared" -ForegroundColor Green
    }
}
catch {
    Write-Host "   App resources setup failed: $_" -ForegroundColor Red
}

# Step 6: Create gradle optimization
Write-Host "Optimizing Gradle configuration..." -ForegroundColor Blue
try {
    $GradleProperties = "android\gradle.properties"
    if (Test-Path $GradleProperties) {
        $GradleOptimizations = @'

# Humidity App Optimizations
org.gradle.jvmargs=-Xmx2048m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configureondemand=true
android.useAndroidX=true
android.enableJetifier=true
'@
        Add-Content -Path $GradleProperties -Value $GradleOptimizations
        Write-Host "   Gradle configuration optimized" -ForegroundColor Green
    }
}
catch {
    Write-Host "   Gradle optimization failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "CAPACITOR ANDROID FRAMEWORK INITIALIZED!" -ForegroundColor Green  
Write-Host "============================================" -ForegroundColor Green
Write-Host "Framework Location: $AndroidFramework" -ForegroundColor Yellow
Write-Host "Android Project: $AndroidFramework\android" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run the main build script: .\build-android.ps1" -ForegroundColor White
Write-Host "2. Or use: .\build-android.ps1 -Release for release build" -ForegroundColor White
Write-Host "3. APK files will be saved in the /apks folder" -ForegroundColor White
Write-Host ""

# Return to project root
Set-Location $ProjectRoot


# WeatherAPI.com Configuration Setup Script (PowerShell)
# Run this script to set up your WeatherAPI.com configuration

param(
    [switch]$Force,
    [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

# Configuration
$ConfigFile = ".env"
$TemplateFile = ".env.template"
$TestUrl = "https://api.weatherapi.com/v1/current.json"

function Write-ColoredOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-ApiKey {
    param([string]$Key)
    
    try {
        $uri = "$TestUrl?key=$Key&q=London&aqi=no"
        $response = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 10
        
        if ($response.current) {
            return @{ Valid = $true; Message = "API key is valid!" }
        } else {
            return @{ Valid = $false; Message = "Invalid API response format" }
        }
    }
    catch {
        $errorMsg = "API validation failed: $($_.Exception.Message)"
        return @{ Valid = $false; Message = $errorMsg }
    }
}

function Get-UserInput {
    param([string]$Prompt)
    
    Write-Host $Prompt -NoNewline -ForegroundColor Yellow
    return Read-Host
}

# Main script
Write-ColoredOutput "🌤️  WeatherAPI.com Configuration Setup" "Cyan"
Write-ColoredOutput "=====================================" "Cyan"
Write-Host

# Check if .env already exists
if ((Test-Path $ConfigFile) -and (-not $Force)) {
    $overwrite = Get-UserInput "⚠️  .env file already exists. Overwrite? (y/n): "
    if ($overwrite -ne "y") {
        Write-ColoredOutput "Setup cancelled." "Yellow"
        exit 0
    }
}

# Check if template exists
if (-not (Test-Path $TemplateFile)) {
    Write-ColoredOutput "❌ Template file '$TemplateFile' not found!" "Red"
    Write-ColoredOutput "Please ensure you're running this script from the project root directory." "Red"
    exit 1
}

# Get API key
if (-not $ApiKey) {
    Write-ColoredOutput "📋 Please follow these steps:" "Green"
    Write-ColoredOutput "1. Visit: https://www.weatherapi.com/signup.aspx" "White"
    Write-ColoredOutput "2. Create a free account" "White"
    Write-ColoredOutput "3. Get your API key from the dashboard" "White"
    Write-ColoredOutput "4. Enter it below" "White"
    Write-Host
    
    $ApiKey = Get-UserInput "🔑 Enter your WeatherAPI.com API key: "
}

if (-not $ApiKey -or $ApiKey.Trim().Length -eq 0) {
    Write-ColoredOutput "❌ No API key provided. Setup cancelled." "Red"
    exit 1
}

$ApiKey = $ApiKey.Trim()

# Validate API key
Write-ColoredOutput "🔍 Validating API key..." "Yellow"
$validation = Test-ApiKey -Key $ApiKey

if (-not $validation.Valid) {
    Write-ColoredOutput "❌ $($validation.Message)" "Red"
    Write-ColoredOutput "Please check your API key and try again." "Red"
    exit 1
}

Write-ColoredOutput "✅ $($validation.Message)" "Green"

# Create .env file
try {
    $template = Get-Content $TemplateFile -Raw
    $envContent = $template -replace "your_weatherapi_key_here", $ApiKey
    
    Set-Content -Path $ConfigFile -Value $envContent -NoNewline
    Write-ColoredOutput "📄 .env file created successfully!" "Green"
    
    # Ask about debug mode
    $debugMode = Get-UserInput "🐛 Enable debug mode? (y/n): "
    if ($debugMode -eq "y") {
        $envContent = $envContent -replace "REACT_APP_WEATHER_DEBUG=false", "REACT_APP_WEATHER_DEBUG=true"
        Set-Content -Path $ConfigFile -Value $envContent -NoNewline
        Write-ColoredOutput "✅ Debug mode enabled" "Green"
    }
    
    Write-Host
    Write-ColoredOutput "🎉 Setup complete!" "Green"
    Write-ColoredOutput "📊 WeatherAPI.com Free Tier Limits:" "Cyan"
    Write-ColoredOutput "   • 1,000,000 calls per month" "White"
    Write-ColoredOutput "   • Current weather ✅" "Green"
    Write-ColoredOutput "   • 3-day forecast ✅" "Green"
    Write-ColoredOutput "   • Historical data (limited) ✅" "Green"
    Write-Host
    Write-ColoredOutput "🚀 You can now start your development server!" "Green"
    Write-ColoredOutput "   npm run dev" "Gray"
    
} catch {
    Write-ColoredOutput "❌ Error creating .env file: $($_.Exception.Message)" "Red"
    exit 1
}

# Optional: Update package.json scripts
$addScript = Get-UserInput "📦 Add setup script to package.json? (y/n): "
if ($addScript -eq "y") {
    try {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        
        if (-not $packageJson.scripts) {
            $packageJson | Add-Member -Type NoteProperty -Name "scripts" -Value @{}
        }
        
        $packageJson.scripts | Add-Member -Type NoteProperty -Name "setup-weather" -Value "node setup-weather-config.js" -Force
        $packageJson.scripts | Add-Member -Type NoteProperty -Name "setup-weather-ps" -Value "powershell -ExecutionPolicy Bypass -File setup-weather-config.ps1" -Force
        
        $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
        Write-ColoredOutput "✅ Added setup scripts to package.json" "Green"
        Write-ColoredOutput "   Run: npm run setup-weather" "Gray"
    } catch {
        Write-ColoredOutput "⚠️  Could not update package.json: $($_.Exception.Message)" "Yellow"
    }
}

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

function Write-ColoredOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Get-UserInput {
    param([string]$Prompt)
    
    Write-Host $Prompt -NoNewline -ForegroundColor Yellow
    return Read-Host
}

# Main script
Write-ColoredOutput "WeatherAPI.com Configuration Setup" "Cyan"
Write-ColoredOutput "====================================" "Cyan"
Write-Host

# Check if .env already exists
if ((Test-Path $ConfigFile) -and (-not $Force)) {
    $overwrite = Get-UserInput "WARNING: .env file already exists. Overwrite? (y/n): "
    if ($overwrite -ne "y") {
        Write-ColoredOutput "Setup cancelled." "Yellow"
        exit 0
    }
}

# Check if template exists
if (-not (Test-Path $TemplateFile)) {
    Write-ColoredOutput "ERROR: Template file '$TemplateFile' not found!" "Red"
    Write-ColoredOutput "Please ensure you're running this script from the project root directory." "Red"
    exit 1
}

# Get API key
if (-not $ApiKey) {
    Write-ColoredOutput "Please follow these steps:" "Green"
    Write-ColoredOutput "1. Visit: https://www.weatherapi.com/signup.aspx" "White"
    Write-ColoredOutput "2. Create a free account" "White"
    Write-ColoredOutput "3. Get your API key from the dashboard" "White"
    Write-ColoredOutput "4. Enter it below" "White"
    Write-Host
    
    $ApiKey = Get-UserInput "Enter your WeatherAPI.com API key: "
}

if (-not $ApiKey -or $ApiKey.Trim().Length -eq 0) {
    Write-ColoredOutput "ERROR: No API key provided. Setup cancelled." "Red"
    exit 1
}

$ApiKey = $ApiKey.Trim()

# Basic validation (check if it looks like an API key)
if ($ApiKey.Length -lt 20) {
    Write-ColoredOutput "WARNING: API key seems too short. Please verify it's correct." "Yellow"
    $continue = Get-UserInput "Continue anyway? (y/n): "
    if ($continue -ne "y") {
        Write-ColoredOutput "Setup cancelled." "Yellow"
        exit 0
    }
}

Write-ColoredOutput "API key received. Length: $($ApiKey.Length) characters" "Green"

# Create .env file
try {
    $template = Get-Content $TemplateFile -Raw
    $envContent = $template -replace "your_weatherapi_key_here", $ApiKey
    
    Set-Content -Path $ConfigFile -Value $envContent -NoNewline
    Write-ColoredOutput ".env file created successfully!" "Green"
    
    # Ask about debug mode
    $debugMode = Get-UserInput "Enable debug mode? (y/n): "
    if ($debugMode -eq "y") {
        $envContent = $envContent -replace "REACT_APP_WEATHER_DEBUG=false", "REACT_APP_WEATHER_DEBUG=true"
        Set-Content -Path $ConfigFile -Value $envContent -NoNewline
        Write-ColoredOutput "Debug mode enabled" "Green"
    }
    
    Write-Host
    Write-ColoredOutput "Setup complete!" "Green"
    Write-ColoredOutput "WeatherAPI.com Free Tier Limits:" "Cyan"
    Write-ColoredOutput "   * 1,000,000 calls per month" "White"
    Write-ColoredOutput "   * Current weather" "Green"
    Write-ColoredOutput "   * 3-day forecast" "Green"
    Write-ColoredOutput "   * Historical data (limited)" "Green"
    Write-Host
    Write-ColoredOutput "Next Steps:" "Yellow"
    Write-ColoredOutput "1. Test your configuration: npm run test-weather" "White"
    Write-ColoredOutput "2. Start development server: npm run dev" "White"
    
} catch {
    Write-ColoredOutput "ERROR: Error creating .env file: $($_.Exception.Message)" "Red"
    exit 1
}

Write-Host
Write-ColoredOutput "Configuration saved! Use 'npm run test-weather' to validate your API key." "Green"

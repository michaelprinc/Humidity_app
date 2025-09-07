# PowerShell skript pro generování fotorealistických sedmisegmentových číslic
# Autor: GitHub Copilot
# Datum: 2025-09-06

param(
    [int]$SamplesPerDigit = 50,
    [int]$Width = 200,
    [int]$Height = 300,
    [string]$OutputDir = "seven_segment_dataset",
    [switch]$PreviewOnly,
    [switch]$SkipValidation
)

Write-Host "=== Generátor fotorealistických sedmisegmentových číslic ===" -ForegroundColor Cyan
Write-Host "Tento nástroj vytvoří trénovací dataset pro OCR modely." -ForegroundColor Gray
Write-Host ""

# Zjištění cesty ke skriptu
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectDir = Split-Path -Parent $ScriptDir

# Kontrola Python
Write-Host "Kontrola Python instalace..." -ForegroundColor Yellow
try {
    $PythonVersion = python --version 2>&1
    Write-Host "✓ $PythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python není nalezen. Prosím nainstalujte Python 3.7+." -ForegroundColor Red
    exit 1
}

# Kontrola pip
try {
    pip --version | Out-Null
    Write-Host "✓ pip je dostupný" -ForegroundColor Green
} catch {
    Write-Host "✗ pip není nalezen." -ForegroundColor Red
    exit 1
}

# Instalace závislostí
Write-Host "`nInstalace potřebných závislostí..." -ForegroundColor Yellow
$RequirementsFile = Join-Path $ProjectDir "requirements.txt"

if (Test-Path $RequirementsFile) {
    try {
        pip install -r $RequirementsFile
        Write-Host "✓ Závislosti úspěšně nainstalovány" -ForegroundColor Green
    } catch {
        Write-Host "✗ Chyba při instalaci závislostí: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠ requirements.txt nenalezen, pokračuji bez instalace" -ForegroundColor Yellow
}

# Příprava výstupního adresáře
$FullOutputDir = Join-Path $ProjectDir $OutputDir
Write-Host "`nVýstupní adresář: $FullOutputDir" -ForegroundColor Gray

# Sestavení příkazu pro generování
$GeneratorScript = Join-Path $ProjectDir "scripts\generate_seven_segment_dataset.py"
$Command = "python `"$GeneratorScript`" --output-dir `"$FullOutputDir`""

if ($PreviewOnly) {
    $Command += " --preview-only"
    Write-Host "`nVytváření pouze náhledu..." -ForegroundColor Yellow
} else {
    $Command += " --samples-per-digit $SamplesPerDigit --width $Width --height $Height"
    Write-Host "`nGenerování datasetu..." -ForegroundColor Yellow
    Write-Host "Parametry:" -ForegroundColor Gray
    Write-Host "  - Vzorků na číslici: $SamplesPerDigit" -ForegroundColor Gray
    Write-Host "  - Rozměry: ${Width}x${Height} px" -ForegroundColor Gray
}

# Spuštění generování
try {
    Write-Host "`nSpouštění: $Command" -ForegroundColor Gray
    Invoke-Expression $Command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Generování úspěšně dokončeno!" -ForegroundColor Green
    } else {
        Write-Host "`n✗ Chyba při generování (exit code: $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "`n✗ Chyba při spuštění generování: $_" -ForegroundColor Red
    exit 1
}

# Validace datasetu (pokud není přeskočena)
if (-not $PreviewOnly -and -not $SkipValidation) {
    Write-Host "`nSpouštění validace datasetu..." -ForegroundColor Yellow
    
    $ValidatorScript = Join-Path $ProjectDir "scripts\validate_dataset.py"
    $ValidationCommand = "python `"$ValidatorScript`" `"$FullOutputDir`" --skip-classification"
    
    try {
        Invoke-Expression $ValidationCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✓ Validace úspěšně dokončena!" -ForegroundColor Green
        } else {
            Write-Host "`n⚠ Validace dokončena s varováními" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "`n⚠ Chyba při validaci: $_" -ForegroundColor Yellow
        Write-Host "Dataset může být stále použitelný." -ForegroundColor Gray
    }
}

# Souhrnné informace
Write-Host "`n=== HOTOVO ===" -ForegroundColor Cyan
if ($PreviewOnly) {
    Write-Host "Náhled vzorků byl vytvořen!" -ForegroundColor Green
} else {
    Write-Host "Dataset byl úspěšně vygenerován!" -ForegroundColor Green
    Write-Host "Celkem vzorků: $($SamplesPerDigit * 10)" -ForegroundColor Gray
}

Write-Host "Výstupní adresář: $FullOutputDir" -ForegroundColor Gray

if (Test-Path $FullOutputDir) {
    $ImageCount = (Get-ChildItem (Join-Path $FullOutputDir "images") -Filter "*.png" -ErrorAction SilentlyContinue).Count
    $PreviewPath = Join-Path $FullOutputDir "sample_preview.png"
    
    Write-Host "`nObsah datasetu:" -ForegroundColor Gray
    Write-Host "  - Obrázky: $ImageCount" -ForegroundColor Gray
    
    if (Test-Path $PreviewPath) {
        Write-Host "  - Náhled: sample_preview.png" -ForegroundColor Gray
    }
    
    Write-Host "`nDataset obsahuje:" -ForegroundColor Gray
    Write-Host "  - Fotorealistické sedmisegmentové číslice (0-9)" -ForegroundColor Gray
    Write-Host "  - Nízký kontrast mezi segmenty a pozadím" -ForegroundColor Gray
    Write-Host "  - Realistické efekty: odlesky, šmouhy, prach, šum" -ForegroundColor Gray
    Write-Host "  - Metadata a anotace pro každý vzorek" -ForegroundColor Gray
}

Write-Host "`nPro další informace viz README.md" -ForegroundColor Gray

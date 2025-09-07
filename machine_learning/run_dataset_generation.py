#!/usr/bin/env python3
"""
Spouštěcí skript pro generování fotorealistických sedmisegmentových číslic.

Použití:
    python run_dataset_generation.py

Tento skript automaticky:
1. Nainstaluje potřebné závislosti
2. Vygeneruje dataset s výchozím nastavením
3. Vytvoří náhled vzorků

Autor: GitHub Copilot
Datum: 2025-09-06
"""

import subprocess
import sys
import os
from pathlib import Path

def install_requirements():
    """Nainstaluje potřebné závislosti."""
    print("Instalace potřebných závislostí...")
    
    requirements_file = Path(__file__).parent / "requirements.txt"
    
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ])
        print("✓ Závislosti úspěšně nainstalovány")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Chyba při instalaci závislostí: {e}")
        return False

def run_generation():
    """Spustí generování datasetu."""
    print("\nSpouštění generování datasetu...")
    
    script_dir = Path(__file__).parent
    generator_script = script_dir / "scripts" / "generate_seven_segment_dataset.py"
    output_dir = script_dir / "seven_segment_dataset"
    
    try:
        # Generování datasetu s výchozím nastavením
        subprocess.check_call([
            sys.executable, str(generator_script),
            "--output-dir", str(output_dir),
            "--samples-per-digit", "50"  # Menší počet pro rychlejší test
        ])
        print("✓ Dataset úspěšně vygenerován")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Chyba při generování datasetu: {e}")
        return False

def main():
    """Hlavní funkce."""
    print("=== Generátor fotorealistických sedmisegmentových číslic ===")
    print("Tento nástroj vytvoří trénovací dataset pro OCR modely.")
    print()
    
    # Kontrola Python verze
    if sys.version_info < (3, 7):
        print("✗ Vyžadován Python 3.7 nebo novější")
        sys.exit(1)
    
    print(f"✓ Python verze: {sys.version}")
    
    # Instalace závislostí
    if not install_requirements():
        sys.exit(1)
    
    # Generování datasetu
    if not run_generation():
        sys.exit(1)
    
    print("\n=== HOTOVO ===")
    print("Dataset byl úspěšně vygenerován!")
    print(f"Výstupní adresář: {Path(__file__).parent / 'seven_segment_dataset'}")
    print("\nDataset obsahuje:")
    print("- Fotorealistické sedmisegmentové číslice (0-9)")
    print("- Nízký kontrast mezi segmenty a pozadím")
    print("- Realistické efekty: odlesky, šmouhy, prach, šum")
    print("- Metadata a anotace pro každý vzorek")
    print("- Náhled vzorků (sample_preview.png)")

if __name__ == "__main__":
    main()

"""
Validační skript pro dataset sedmisegmentových číslic.

Tento skript provádí:
1. Kontrolu integrity datasetu
2. Statistickou analýzu vzorků
3. Vizualizaci distribuce
4. Test jednoduchého klasifikačního modelu

Autor: GitHub Copilot
Datum: 2025-09-06
"""

import json
import numpy as np
import cv2
import matplotlib.pyplot as plt
from pathlib import Path
from collections import Counter
import seaborn as sns
from typing import Dict, List, Tuple

class DatasetValidator:
    def __init__(self, dataset_dir: str):
        """
        Inicializace validátoru datasetu.
        
        Args:
            dataset_dir: Cesta k datasetu
        """
        self.dataset_dir = Path(dataset_dir)
        self.images_dir = self.dataset_dir / 'images'
        self.annotations_dir = self.dataset_dir / 'annotations'
        
        # Načtení metadat
        metadata_file = self.annotations_dir / 'dataset_metadata.json'
        if metadata_file.exists():
            with open(metadata_file, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = []
    
    def validate_integrity(self) -> Dict[str, bool]:
        """Ověří integritu datasetu."""
        results = {}
        
        print("=== Kontrola integrity datasetu ===")
        
        # 1. Kontrola existence adresářů
        results['directories_exist'] = all([
            self.dataset_dir.exists(),
            self.images_dir.exists(),
            self.annotations_dir.exists()
        ])
        print(f"✓ Adresáře existují: {results['directories_exist']}")
        
        # 2. Kontrola metadat
        results['metadata_exists'] = len(self.metadata) > 0
        print(f"✓ Metadata načtena: {results['metadata_exists']} ({len(self.metadata)} vzorků)")
        
        # 3. Kontrola existence obrázků
        missing_images = []
        for item in self.metadata:
            img_path = self.images_dir / item['filename']
            if not img_path.exists():
                missing_images.append(item['filename'])
        
        results['all_images_exist'] = len(missing_images) == 0
        print(f"✓ Všechny obrázky existují: {results['all_images_exist']}")
        if missing_images:
            print(f"  Chybějící obrázky: {len(missing_images)}")
        
        # 4. Kontrola distribuce číslic
        digit_counts = Counter(item['digit'] for item in self.metadata)
        expected_digits = set('0123456789')
        actual_digits = set(digit_counts.keys())
        
        results['all_digits_present'] = expected_digits == actual_digits
        print(f"✓ Všechny číslice přítomny: {results['all_digits_present']}")
        
        if not results['all_digits_present']:
            missing = expected_digits - actual_digits
            extra = actual_digits - expected_digits
            if missing:
                print(f"  Chybějící číslice: {missing}")
            if extra:
                print(f"  Neočekávané číslice: {extra}")
        
        # 5. Kontrola vyváženosti datasetu
        min_count = min(digit_counts.values()) if digit_counts else 0
        max_count = max(digit_counts.values()) if digit_counts else 0
        balance_ratio = min_count / max_count if max_count > 0 else 0
        
        results['dataset_balanced'] = balance_ratio >= 0.8  # tolerance 20%
        print(f"✓ Dataset vyvážený: {results['dataset_balanced']} (poměr: {balance_ratio:.2f})")
        
        return results
    
    def analyze_image_statistics(self) -> Dict[str, any]:
        """Analyzuje statistiky obrázků."""
        print("\n=== Analýza statistik obrázků ===")
        
        if not self.metadata:
            print("✗ Žádná metadata k analýze")
            return {}
        
        # Vzorkování obrázků pro analýzu (max 100 pro rychlost)
        sample_size = min(100, len(self.metadata))
        sample_metadata = np.random.choice(self.metadata, sample_size, replace=False)
        
        brightness_values = []
        contrast_values = []
        dimensions = []
        
        print(f"Analyzuji {sample_size} vzorků...")
        
        for i, item in enumerate(sample_metadata):
            img_path = self.images_dir / item['filename']
            
            if not img_path.exists():
                continue
                
            # Načtení obrázku
            img = cv2.imread(str(img_path))
            if img is None:
                continue
            
            # Převod na grayscale pro analýzu
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Výpočet statistik
            brightness = np.mean(gray)
            contrast = np.std(gray)
            
            brightness_values.append(brightness)
            contrast_values.append(contrast)
            dimensions.append(img.shape[:2])
            
            if (i + 1) % 20 == 0:
                print(f"  Zpracováno: {i + 1}/{sample_size}")
        
        # Výpočet souhrnných statistik
        stats = {
            'sample_count': len(brightness_values),
            'brightness': {
                'mean': np.mean(brightness_values),
                'std': np.std(brightness_values),
                'min': np.min(brightness_values),
                'max': np.max(brightness_values)
            },
            'contrast': {
                'mean': np.mean(contrast_values),
                'std': np.std(contrast_values),
                'min': np.min(contrast_values),
                'max': np.max(contrast_values)
            },
            'dimensions': {
                'unique': list(set(dimensions)),
                'most_common': Counter(dimensions).most_common(1)[0] if dimensions else None
            }
        }
        
        # Vypsání výsledků
        print(f"✓ Analyzováno vzorků: {stats['sample_count']}")
        print(f"✓ Průměrná jasnost: {stats['brightness']['mean']:.1f} ± {stats['brightness']['std']:.1f}")
        print(f"✓ Průměrný kontrast: {stats['contrast']['mean']:.1f} ± {stats['contrast']['std']:.1f}")
        print(f"✓ Nejčastější rozměry: {stats['dimensions']['most_common']}")
        
        return stats
    
    def create_visualizations(self, output_dir: str = None):
        """Vytvoří vizualizace datasetu."""
        if output_dir is None:
            output_dir = self.dataset_dir
        
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        print("\n=== Vytváření vizualizací ===")
        
        # 1. Distribuce číslic
        digit_counts = Counter(item['digit'] for item in self.metadata)
        
        plt.figure(figsize=(10, 6))
        digits = sorted(digit_counts.keys())
        counts = [digit_counts[d] for d in digits]
        
        plt.bar(digits, counts, color='skyblue', edgecolor='navy', alpha=0.7)
        plt.title('Distribuce číslic v datasetu')
        plt.xlabel('Číslice')
        plt.ylabel('Počet vzorků')
        plt.grid(axis='y', alpha=0.3)
        
        for i, count in enumerate(counts):
            plt.text(i, count + max(counts) * 0.01, str(count), 
                    ha='center', va='bottom', fontweight='bold')
        
        plt.tight_layout()
        plt.savefig(output_path / 'digit_distribution.png', dpi=150, bbox_inches='tight')
        plt.close()
        
        # 2. Vzorky všech číslic
        fig, axes = plt.subplots(2, 5, figsize=(15, 9))
        fig.suptitle('Vzorky sedmisegmentových číslic', fontsize=16)
        
        for i, digit in enumerate('0123456789'):
            row = i // 5
            col = i % 5
            
            # Najít první vzorek této číslice
            digit_samples = [item for item in self.metadata if item['digit'] == digit]
            if digit_samples:
                img_path = self.images_dir / digit_samples[0]['filename']
                if img_path.exists():
                    img = cv2.imread(str(img_path))
                    if img is not None:
                        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                        axes[row, col].imshow(img_rgb)
            
            axes[row, col].set_title(f'Číslice: {digit}')
            axes[row, col].axis('off')
        
        plt.tight_layout()
        plt.savefig(output_path / 'digit_samples.png', dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"✓ Vizualizace uloženy do: {output_path}")
    
    def run_simple_classification_test(self):
        """Spustí jednoduchý test klasifikace."""
        print("\n=== Test jednoduchého klasifikátoru ===")
        
        try:
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.model_selection import train_test_split
            from sklearn.metrics import accuracy_score, classification_report
        except ImportError:
            print("✗ Chybí scikit-learn pro test klasifikace")
            print("  Instalace: pip install scikit-learn")
            return
        
        if len(self.metadata) < 100:
            print("✗ Nedostatek vzorků pro test klasifikace")
            return
        
        # Načtení vzorků dat
        print("Načítání vzorků pro test...")
        X, y = [], []
        
        # Vzorkování pro rychlost (max 500 vzorků)
        sample_size = min(500, len(self.metadata))
        sample_metadata = np.random.choice(self.metadata, sample_size, replace=False)
        
        for item in sample_metadata:
            img_path = self.images_dir / item['filename']
            if not img_path.exists():
                continue
            
            img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue
            
            # Zmenšení obrázku a převod na vektor
            img_small = cv2.resize(img, (32, 48))  # menší rozlišení pro rychlost
            features = img_small.flatten()
            
            X.append(features)
            y.append(int(item['digit']))
        
        if len(X) < 20:
            print("✗ Nedostatek platných vzorků")
            return
        
        X = np.array(X)
        y = np.array(y)
        
        print(f"✓ Načteno vzorků: {len(X)}")
        
        # Rozdělení na trénovací a testovací sadu
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.3, random_state=42, stratify=y
        )
        
        # Trénování modelu
        print("Trénování Random Forest klasifikátoru...")
        clf = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
        clf.fit(X_train, y_train)
        
        # Predikce a vyhodnocení
        y_pred = clf.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"✓ Přesnost klasifikace: {accuracy:.3f}")
        
        if accuracy > 0.8:
            print("✓ Výborná separovatelnost číslic")
        elif accuracy > 0.6:
            print("⚠ Střední separovatelnost číslic")
        else:
            print("✗ Nízká separovatelnost číslic")
        
        # Detailní report
        report = classification_report(y_test, y_pred, target_names=[str(i) for i in range(10)])
        print("\nDetailní výsledky:")
        print(report)

def main():
    """Hlavní funkce pro validaci datasetu."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Validace datasetu sedmisegmentových číslic')
    parser.add_argument('dataset_dir', type=str, help='Cesta k datasetu')
    parser.add_argument('--skip-classification', action='store_true',
                       help='Přeskočit test klasifikace')
    parser.add_argument('--output-dir', type=str,
                       help='Adresář pro výstupní vizualizace')
    
    args = parser.parse_args()
    
    # Vytvoření validátoru
    validator = DatasetValidator(args.dataset_dir)
    
    # Spuštění validace
    print("=== VALIDACE DATASETU SEDMISEGMENTOVÝCH ČÍSLIC ===\n")
    
    # 1. Kontrola integrity
    integrity_results = validator.validate_integrity()
    
    if not all(integrity_results.values()):
        print("\n⚠ Dataset obsahuje problémy!")
        return
    
    # 2. Statistická analýza
    stats = validator.analyze_image_statistics()
    
    # 3. Vizualizace
    validator.create_visualizations(args.output_dir)
    
    # 4. Test klasifikace (pokud není přeskočen)
    if not args.skip_classification:
        validator.run_simple_classification_test()
    
    print("\n=== VALIDACE DOKONČENA ===")
    print("Dataset je připraven k použití!")

if __name__ == "__main__":
    main()

"""
Generátor fotorealistických sedmisegmentových digitálních číslic pro trénování OCR modelů.

Tento skript vytváří realistické vzorky s následujícími vlastnostmi:
- Nízký kontrast mezi číslicemi a pozadím
- Černé/tmavé segmenty na šedivém/stříbrném pozadí
- Odlesky na displeji
- Šmouhy a nečistoty na displeji
- Prach a poškrábání
- Různé úhly pohledu a osvětlení

Autor: GitHub Copilot
Datum: 2025-09-06
"""

import numpy as np
import cv2
import random
import os
from pathlib import Path
import json
from typing import Tuple, List, Dict
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import argparse

class SevenSegmentGenerator:
    def __init__(self, width: int = 200, height: int = 300):
        """
        Inicializace generátoru sedmisegmentových displejů.
        
        Args:
            width: Šířka výsledného obrázku
            height: Výška výsledného obrázku
        """
        self.width = width
        self.height = height
        
        # Definice segmentů (pozice relativní k rozměrům)
        self.segments = {
            'a': [(0.2, 0.1), (0.8, 0.1), (0.75, 0.15), (0.25, 0.15)],  # horní
            'b': [(0.8, 0.1), (0.85, 0.15), (0.8, 0.45), (0.75, 0.4)],   # pravý horní
            'c': [(0.8, 0.55), (0.85, 0.6), (0.8, 0.9), (0.75, 0.85)],   # pravý dolní
            'd': [(0.2, 0.9), (0.8, 0.9), (0.75, 0.85), (0.25, 0.85)],   # dolní
            'e': [(0.15, 0.6), (0.2, 0.55), (0.25, 0.85), (0.2, 0.9)],   # levý dolní
            'f': [(0.15, 0.15), (0.2, 0.1), (0.25, 0.4), (0.2, 0.45)],   # levý horní
            'g': [(0.2, 0.45), (0.8, 0.45), (0.75, 0.5), (0.25, 0.5)]    # střední
        }
        
        # Mapování číslic na aktivní segmenty
        self.digit_segments = {
            '0': ['a', 'b', 'c', 'd', 'e', 'f'],
            '1': ['b', 'c'],
            '2': ['a', 'b', 'g', 'e', 'd'],
            '3': ['a', 'b', 'g', 'c', 'd'],
            '4': ['f', 'g', 'b', 'c'],
            '5': ['a', 'f', 'g', 'c', 'd'],
            '6': ['a', 'f', 'g', 'e', 'd', 'c'],
            '7': ['a', 'b', 'c'],
            '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
            '9': ['a', 'b', 'c', 'd', 'f', 'g']
        }

    def create_clean_digit(self, digit: str) -> np.ndarray:
        """Vytvoří čistou sedmisegmentovou číslici."""
        img = np.ones((self.height, self.width, 3), dtype=np.uint8) * 220  # světle šedé pozadí
        
        active_segments = self.digit_segments.get(digit, [])
        
        for segment in active_segments:
            points = self.segments[segment]
            # Převod relativních souřadnic na absolutní
            abs_points = [(int(x * self.width), int(y * self.height)) for x, y in points]
            
            # Vykreslení segmentu
            cv2.fillPoly(img, [np.array(abs_points)], (40, 40, 40))  # tmavě šedé segmenty
            
        return img

    def add_realistic_effects(self, img: np.ndarray) -> np.ndarray:
        """Přidá realistické efekty k číslici."""
        result = img.copy()
        
        # 1. Snížení kontrastu
        result = self._reduce_contrast(result)
        
        # 2. Přidání odlesků
        result = self._add_reflections(result)
        
        # 3. Přidání šmouh a nečistot
        result = self._add_smudges(result)
        
        # 4. Přidání prachu
        result = self._add_dust(result)
        
        # 5. Přidání šumu
        result = self._add_noise(result)
        
        # 6. Simulace různého osvětlení
        result = self._vary_lighting(result)
        
        return result

    def _reduce_contrast(self, img: np.ndarray) -> np.ndarray:
        """Sníží kontrast mezi segmenty a pozadím."""
        # Převod na float pro přesnější výpočty
        img_float = img.astype(np.float32) / 255.0
        
        # Snížení kontrastu - segmenty budou méně výrazné
        contrast_factor = random.uniform(0.3, 0.7)
        img_float = 0.5 + contrast_factor * (img_float - 0.5)
        
        # Přidání mírného světlého odstínu k segmentům
        mask = np.all(img < 100, axis=2)  # tmavé oblasti (segmenty)
        img_float[mask] += random.uniform(0.1, 0.3)
        
        return np.clip(img_float * 255, 0, 255).astype(np.uint8)

    def _add_reflections(self, img: np.ndarray) -> np.ndarray:
        """Přidá odlesky typické pro LCD/LED displeje."""
        h, w = img.shape[:2]
        
        # Vytvoření gradientu pro odlesk
        for _ in range(random.randint(1, 3)):
            # Náhodná pozice a velikost odlesku
            center_x = random.randint(0, w)
            center_y = random.randint(0, h)
            radius = random.randint(20, 80)
            
            # Vytvoření masky pro odlesk
            y, x = np.ogrid[:h, :w]
            mask = (x - center_x)**2 + (y - center_y)**2 <= radius**2
            
            # Přidání bílého odlesku s gradientem
            intensity = random.uniform(0.2, 0.6)
            distance = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            fade = np.maximum(0, 1 - distance / radius)
            
            overlay = np.zeros_like(img, dtype=np.float32)
            overlay[mask] = intensity * fade[mask, np.newaxis]
            
            img = np.clip(img.astype(np.float32) + overlay * 255, 0, 255).astype(np.uint8)
        
        return img

    def _add_smudges(self, img: np.ndarray) -> np.ndarray:
        """Přidá šmouhy a otisky prstů."""
        h, w = img.shape[:2]
        
        for _ in range(random.randint(2, 5)):
            # Náhodná pozice šmouhy
            x = random.randint(0, w - 50)
            y = random.randint(0, h - 50)
            
            # Velikost a tvar šmouhy
            size_x = random.randint(20, 60)
            size_y = random.randint(15, 40)
            
            # Vytvoření eliptické šmouhy
            mask = np.zeros((h, w), dtype=np.uint8)
            cv2.ellipse(mask, (x + size_x//2, y + size_y//2), 
                       (size_x//2, size_y//2), 
                       random.randint(0, 180), 0, 360, 255, -1)
            
            # Rozmazání šmouhy
            mask = cv2.GaussianBlur(mask, (15, 15), 0)
            
            # Aplikace šmouhy (ztmavení)
            smudge_intensity = random.uniform(0.05, 0.15)
            img_float = img.astype(np.float32)
            img_float -= (mask[:, :, np.newaxis] / 255.0) * smudge_intensity * 255
            img = np.clip(img_float, 0, 255).astype(np.uint8)
        
        return img

    def _add_dust(self, img: np.ndarray) -> np.ndarray:
        """Přidá prach a drobné nečistoty."""
        h, w = img.shape[:2]
        
        # Počet částic prachu
        num_particles = random.randint(10, 30)
        
        for _ in range(num_particles):
            x = random.randint(0, w-1)
            y = random.randint(0, h-1)
            
            # Velikost částice
            size = random.randint(1, 3)
            
            # Barva částice (různé odstíny šedi)
            color = random.randint(60, 180)
            
            if size == 1:
                img[y, x] = [color, color, color]
            else:
                cv2.circle(img, (x, y), size, (color, color, color), -1)
        
        return img

    def _add_noise(self, img: np.ndarray) -> np.ndarray:
        """Přidá Gaussovský šum."""
        noise = np.random.normal(0, random.uniform(2, 8), img.shape)
        img_float = img.astype(np.float32) + noise
        return np.clip(img_float, 0, 255).astype(np.uint8)

    def _vary_lighting(self, img: np.ndarray) -> np.ndarray:
        """Simuluje různé osvětlení."""
        h, w = img.shape[:2]
        
        # Vytvoření gradientu osvětlení
        lighting_type = random.choice(['left', 'right', 'top', 'bottom', 'center'])
        
        if lighting_type == 'left':
            gradient = np.linspace(1.2, 0.8, w)
            lighting = np.tile(gradient, (h, 1))
        elif lighting_type == 'right':
            gradient = np.linspace(0.8, 1.2, w)
            lighting = np.tile(gradient, (h, 1))
        elif lighting_type == 'top':
            gradient = np.linspace(1.2, 0.8, h)
            lighting = np.tile(gradient.reshape(-1, 1), (1, w))
        elif lighting_type == 'bottom':
            gradient = np.linspace(0.8, 1.2, h)
            lighting = np.tile(gradient.reshape(-1, 1), (1, w))
        else:  # center
            y, x = np.ogrid[:h, :w]
            center_x, center_y = w//2, h//2
            distance = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            max_distance = np.sqrt(center_x**2 + center_y**2)
            lighting = 1.3 - 0.5 * (distance / max_distance)
        
        # Aplikace osvětlení
        img_float = img.astype(np.float32)
        img_float *= lighting[:, :, np.newaxis]
        
        return np.clip(img_float, 0, 255).astype(np.uint8)

    def generate_sample(self, digit: str) -> Tuple[np.ndarray, Dict]:
        """Vygeneruje jeden realistický vzorek číslice."""
        # Vytvoření čisté číslice
        clean_img = self.create_clean_digit(digit)
        
        # Přidání realistických efektů
        realistic_img = self.add_realistic_effects(clean_img)
        
        # Metadata
        metadata = {
            'digit': digit,
            'width': self.width,
            'height': self.height,
            'effects_applied': ['low_contrast', 'reflections', 'smudges', 'dust', 'noise', 'lighting_variation']
        }
        
        return realistic_img, metadata

def generate_dataset(output_dir: str, samples_per_digit: int = 100, 
                    img_width: int = 200, img_height: int = 300):
    """
    Vygeneruje kompletní dataset sedmisegmentových číslic.
    
    Args:
        output_dir: Cesta k výstupnímu adresáři
        samples_per_digit: Počet vzorků na každou číslici
        img_width: Šířka obrázků
        img_height: Výška obrázků
    """
    generator = SevenSegmentGenerator(img_width, img_height)
    
    # Vytvoření výstupních adresářů
    images_dir = Path(output_dir) / 'images'
    annotations_dir = Path(output_dir) / 'annotations'
    images_dir.mkdir(parents=True, exist_ok=True)
    annotations_dir.mkdir(parents=True, exist_ok=True)
    
    all_metadata = []
    sample_count = 0
    
    print("Generování fotorealistických sedmisegmentových číslic...")
    
    for digit in '0123456789':
        print(f"Generování číslice '{digit}': ", end='')
        
        for i in range(samples_per_digit):
            # Generování vzorku
            img, metadata = generator.generate_sample(digit)
            
            # Uložení obrázku
            filename = f"seven_segment_{digit}_{i:04d}.png"
            img_path = images_dir / filename
            cv2.imwrite(str(img_path), img)
            
            # Přidání cesty k metadatům
            metadata['filename'] = filename
            metadata['sample_id'] = sample_count
            all_metadata.append(metadata)
            
            sample_count += 1
            
            if (i + 1) % 20 == 0:
                print(f"{i + 1}", end=' ')
        
        print("✓")
    
    # Uložení metadat
    metadata_file = annotations_dir / 'dataset_metadata.json'
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(all_metadata, f, indent=2, ensure_ascii=False)
    
    # Vytvoření souhrnné statistiky
    summary = {
        'total_samples': sample_count,
        'samples_per_digit': samples_per_digit,
        'digits': list('0123456789'),
        'image_dimensions': {'width': img_width, 'height': img_height},
        'generation_date': '2025-09-06',
        'description': 'Fotorealistické sedmisegmentové číslice s nízkým kontrastem, odlesky, šmouhami a nečistotami'
    }
    
    summary_file = Path(output_dir) / 'dataset_summary.json'
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\nDataset úspěšně vygenerován!")
    print(f"Celkem vzorků: {sample_count}")
    print(f"Výstupní adresář: {output_dir}")
    print(f"Obrázky: {images_dir}")
    print(f"Anotace: {annotations_dir}")

def create_sample_preview(output_dir: str, preview_file: str = 'sample_preview.png'):
    """Vytvoří náhled vzorků z datasetu."""
    generator = SevenSegmentGenerator(200, 300)
    
    # Vytvoření mřížky s příklady všech číslic
    fig, axes = plt.subplots(2, 5, figsize=(15, 9))
    fig.suptitle('Fotorealistické sedmisegmentové číslice - Vzorky', fontsize=16)
    
    for i, digit in enumerate('0123456789'):
        row = i // 5
        col = i % 5
        
        # Generování vzorku
        img, _ = generator.generate_sample(digit)
        
        # Zobrazení
        axes[row, col].imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        axes[row, col].set_title(f'Číslice: {digit}', fontsize=12)
        axes[row, col].axis('off')
    
    plt.tight_layout()
    preview_path = Path(output_dir) / preview_file
    plt.savefig(preview_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"Náhled vzorků uložen: {preview_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generátor fotorealistických sedmisegmentových číslic')
    parser.add_argument('--output-dir', type=str, required=True,
                       help='Výstupní adresář pro dataset')
    parser.add_argument('--samples-per-digit', type=int, default=100,
                       help='Počet vzorků na číslici (výchozí: 100)')
    parser.add_argument('--width', type=int, default=200,
                       help='Šířka obrázků (výchozí: 200)')
    parser.add_argument('--height', type=int, default=300,
                       help='Výška obrázků (výchozí: 300)')
    parser.add_argument('--preview-only', action='store_true',
                       help='Vytvoří pouze náhled bez generování celého datasetu')
    
    args = parser.parse_args()
    
    if args.preview_only:
        create_sample_preview(args.output_dir)
    else:
        generate_dataset(args.output_dir, args.samples_per_digit, args.width, args.height)
        create_sample_preview(args.output_dir)

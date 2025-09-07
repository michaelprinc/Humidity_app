# Fotorealistický dataset sedmisegmentových digitálních číslic

## Přehled

Tento dataset obsahuje fotorealistické vzorky sedmisegmentových digitálních číslic (0-9) vytvořené pro trénování OCR (Optical Character Recognition) modelů. Dataset je speciálně navržen tak, aby simuloval reálné podmínky, se kterými se OCR systémy setkávají v praxi.

## Klíčové vlastnosti

### Realistické charakteristiky
- **Nízký kontrast**: Segmenty jsou tmavě šedé na světle šedém/stříbrném pozadí
- **Odlesky**: Simulace odlesků typických pro LCD/LED displeje
- **Šmouhy a otisky**: Nečistoty a otisky prstů na displeji
- **Prach a částice**: Drobné nečistoty a prach na povrchu
- **Šum**: Gaussovský šum simulující digitální kameru
- **Různé osvětlení**: Nerovnoměrné osvětlení z různých úhlů

### Technické specifikace
- **Rozlišení**: 200x300 pixelů (výchozí)
- **Formát**: PNG s RGB barevným prostorem
- **Počet vzorků**: 100 na číslici (celkem 1000 vzorků)
- **Číslice**: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9

## Struktura datasetu

```
seven_segment_dataset/
├── images/                          # Obrázky vzorků
│   ├── seven_segment_0_0000.png    # Číslice 0, vzorek 0
│   ├── seven_segment_0_0001.png    # Číslice 0, vzorek 1
│   └── ...
├── annotations/                     # Anotace a metadata
│   └── dataset_metadata.json       # Kompletní metadata
├── dataset_summary.json            # Souhrnné informace
└── sample_preview.png              # Náhled vzorků
```

## Metadata

Každý vzorek má asociovaná metadata obsahující:

```json
{
  "digit": "5",
  "width": 200,
  "height": 300,
  "effects_applied": [
    "low_contrast",
    "reflections", 
    "smudges",
    "dust",
    "noise",
    "lighting_variation"
  ],
  "filename": "seven_segment_5_0042.png",
  "sample_id": 542
}
```

## Použití

### 1. Generování datasetu

```bash
# Instalace závislostí
pip install -r requirements.txt

# Generování s výchozím nastavením
python scripts/generate_seven_segment_dataset.py --output-dir seven_segment_dataset

# Vlastní nastavení
python scripts/generate_seven_segment_dataset.py \
    --output-dir my_dataset \
    --samples-per-digit 200 \
    --width 300 \
    --height 400
```

### 2. Rychlé spuštění
```bash
python run_dataset_generation.py
```

### 3. Pouze náhled
```bash
python scripts/generate_seven_segment_dataset.py \
    --output-dir preview \
    --preview-only
```

## Příklady použití v ML

### PyTorch DataLoader
```python
import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import json

class SevenSegmentDataset(Dataset):
    def __init__(self, dataset_dir, transform=None):
        self.dataset_dir = Path(dataset_dir)
        self.transform = transform
        
        # Načtení metadat
        with open(self.dataset_dir / 'annotations' / 'dataset_metadata.json') as f:
            self.metadata = json.load(f)
    
    def __len__(self):
        return len(self.metadata)
    
    def __getitem__(self, idx):
        item = self.metadata[idx]
        
        # Načtení obrázku
        img_path = self.dataset_dir / 'images' / item['filename']
        image = Image.open(img_path).convert('RGB')
        
        if self.transform:
            image = self.transform(image)
        
        label = int(item['digit'])
        
        return image, label
```

### TensorFlow/Keras
```python
import tensorflow as tf
from pathlib import Path
import json

def load_seven_segment_dataset(dataset_dir):
    dataset_dir = Path(dataset_dir)
    
    # Načtení metadat
    with open(dataset_dir / 'annotations' / 'dataset_metadata.json') as f:
        metadata = json.load(f)
    
    # Vytvoření seznamů cest a labelů
    image_paths = [str(dataset_dir / 'images' / item['filename']) for item in metadata]
    labels = [int(item['digit']) for item in metadata]
    
    # Vytvoření TF datasetu
    dataset = tf.data.Dataset.from_tensor_slices((image_paths, labels))
    
    def load_and_preprocess_image(path, label):
        image = tf.io.read_file(path)
        image = tf.image.decode_png(image, channels=3)
        image = tf.cast(image, tf.float32) / 255.0
        return image, label
    
    dataset = dataset.map(load_and_preprocess_image)
    
    return dataset
```

## Validace kvality

Pro ověření kvality datasetu je doporučeno:

1. **Vizuální kontrola**: Prohlédnutí náhledu vzorků
2. **Statistická analýza**: Kontrola distribuce pixelových hodnot
3. **Testování na jednoduchém modelu**: Ověření, že model dokáže rozlišit číslice

## Rozšíření

Dataset lze rozšířit o:

- **Víceciferné displeje**: Kombinace více číslic
- **Různé fonty**: Různé styly sedmisegmentových displejů
- **Barevné varianty**: Červené, zelené, modré displeje
- **Perspektivní deformace**: Simulace pohledu z různých úhlů
- **Rozmazání pohybem**: Simulace pohybu kamery

## Licence

Dataset je vytvořen pro vzdělávací a výzkumné účely. Pro komerční použití kontaktujte autora.

## Autor

Vytvořeno pomocí GitHub Copilot
Datum: 6. září 2025

## Technické poznámky

### Požadavky na systém
- Python 3.7+
- OpenCV 4.x
- NumPy 1.20+
- Matplotlib 3.x
- Pillow 8.x+

### Výkon
- Generování 1000 vzorků: ~2-5 minut (závisí na HW)
- Velikost datasetu: ~15-25 MB
- RAM požadavky: ~500 MB během generování

### Známé omezení
- Segmenty mají pevně dané proporce
- Simulované efekty jsou procedurálně generované
- Neobsahuje reálné fotografie displejů

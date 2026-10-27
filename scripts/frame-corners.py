# Converte os ornamentos de canto das molduras do cartão (gerados por IA, fundo magenta ou cinza
# liso) em PNG transparente de 32×32.
#   Entrada: art/frames/<moldura>.jpg|png   (bronze, silver, gold, platinum — o canto de cima à esquerda)
#   Saída:   public/sprites/frames/<moldura>.png
# Uso: python scripts/frame-corners.py   (requer Pillow)

import importlib.util
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'frames'
OUT = ROOT / 'public' / 'sprites' / 'frames'
SIZE = 32

# Reaproveita a remoção de fundo do script dos climas.
_spec = importlib.util.spec_from_file_location('weather_sprites', Path(__file__).with_name('weather-sprites.py'))
weather = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(weather)

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(SRC.glob('*.jpg')) + sorted(SRC.glob('*.png')):
        rgba = weather.key_out(Image.open(src).convert('RGB'))
        box = rgba.getchannel('A').getbbox()
        if box:
            rgba = rgba.crop(box)
        # Quadrado, encostado no canto de cima à esquerda (é o canto que o jogo espelha).
        side = max(rgba.size)
        square = Image.new('RGBA', (side, side))
        square.paste(rgba, (0, 0))
        out = square.convert('RGBa').resize((SIZE, SIZE), Image.Resampling.BOX).convert('RGBA')
        out.save(OUT / f'{src.stem}.png', optimize=True)
        print(f'{src.name} -> public/sprites/frames/{src.stem}.png')

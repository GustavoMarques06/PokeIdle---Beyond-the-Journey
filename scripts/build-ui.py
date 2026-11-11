# Copia para public/sprites/ui/ as peças de interface em pixel art guardadas em art/ui-packs (todas CC0; ver LEIA.txt):
#   - balloons.png: balões animados (Imanor), 4 linhas (coração, reticências, exclamação, interrogação) × 8 quadros 16×16
#   - emote-<humor>.png: rostinhos em balão (16x16 Emotes), a versão do meio
#   - award-<peça>-<metal>.png: taças, medalhas e rosetas (Arne16)
# Uso: python scripts/build-ui.py   (requer Pillow)

import io
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'ui-packs'
OUT = ROOT / 'public' / 'sprites' / 'ui'
OUT.mkdir(parents=True, exist_ok=True)

Image.open(SRC / 'ImanorBalloon.png').convert('RGBA').save(OUT / 'balloons.png', optimize=True)

EMOTES = ['angry', 'bored', 'confused', 'doh', 'happy', 'neutral', 'sad', 'veryHappy', 'worried']
with zipfile.ZipFile(SRC / 'Emotes.zip') as z:
    for name in EMOTES:
        im = Image.open(io.BytesIO(z.read(f'Emotes/mid/{name}Emote.png'))).convert('RGBA')
        im.save(OUT / f"emote-{name.lower()}.png", optimize=True)

with zipfile.ZipFile(SRC / 'awards_0.zip') as z:
    for kind, folder in (('cup', 'cups/cup'), ('medal', 'medals/medal')):
        for metal in ('gold', 'silver', 'bronze'):
            im = Image.open(io.BytesIO(z.read(f'awards/{folder}_{metal}.png'))).convert('RGBA')
            im.save(OUT / f'award-{kind}-{metal}.png', optimize=True)
    for color in ('red', 'blue', 'green', 'yellow'):
        im = Image.open(io.BytesIO(z.read(f'awards/rosettes/rosette_{color}.png'))).convert('RGBA')
        im.save(OUT / f'award-rosette-{color}.png', optimize=True)

for f in sorted(OUT.glob('*.png')):
    print(f.name, Image.open(f).size)

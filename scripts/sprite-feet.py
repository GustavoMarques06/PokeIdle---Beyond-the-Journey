# Mede onde ficam os "pés" de cada sprite de batalha: o centro e a largura dos pixels desenhados
# nas linhas de baixo e a linha mais baixa e a mais alta (somando todos os quadros da animação).
# A cena usa isso para apoiar o Pokémon sobre a sombra, já que asas e caudas tiram o corpo do
# centro da imagem e alguns GIFs têm margem vazia. Também mede o quanto ele flutua: Pokémon que
# voam passam a maior parte da animação longe do chão, e a sombra deles pulsa.
# Uso: python scripts/sprite-feet.py  (requer Pillow). Rode de novo após `npm run fetch-data`.

import json
import statistics
from pathlib import Path

from PIL import Image, ImageChops, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ROOT / 'public' / 'sprites' / 'pokemon'
OUT = ROOT / 'src' / 'game-data' / 'generated' / 'sprite-feet.json'

# Fração da altura desenhada, a partir de baixo, que conta como "pés".
FOOT_BAND = 0.14


def opaque(frame):
    return frame.convert('RGBA').getchannel('A').point(lambda v: 255 if v > 24 else 0)


def feet(path: Path):
    """[centro x, largura, base, topo, flutuação, largura da imagem, altura da imagem] em pixels do
    sprite (a flutuação é a fração da altura desenhada entre o chão e a base típica dos quadros).
    Alguns GIFs (o Rattata de costas) têm margem vazia em volta do desenho."""
    mask = None
    bottoms = []
    with Image.open(path) as im:
        for frame in ImageSequence.Iterator(im):
            a = opaque(frame)
            b = a.getbbox()
            if b:
                bottoms.append(b[3])
            mask = a if mask is None else ImageChops.lighter(mask, a)
    box = mask.getbbox() if mask else None
    if not box:
        return None
    top = max(box[1], box[3] - max(3, round((box[3] - box[1]) * FOOT_BAND)))
    band = mask.crop((0, top, mask.width, box[3])).getbbox()
    if not band:
        return None
    hover = (box[3] - statistics.median(bottoms)) / max(1, box[3] - box[1])
    w, h = mask.size
    return [round((band[0] + band[2]) / 2, 1), band[2] - band[0], box[3], box[1], round(hover, 2), w, h]


def order(key: str):
    sid, _, form = key.partition('-')
    return (int(sid), form)


result = {}
for kind in ('front', 'back'):
    # Espécies (chave "201") e formas alternativas (chave "201-b", em pokemon/forms/).
    for folder in (SPRITES / kind, SPRITES / 'forms' / kind):
        for f in folder.glob('*.gif'):
            v = feet(f)
            if v:
                result.setdefault(f.stem, {})[kind] = v

OUT.write_text(json.dumps(dict(sorted(result.items(), key=lambda kv: order(kv[0]))), separators=(',', ':')) + '\n')
print(f'{len(result)} espécies -> {OUT.relative_to(ROOT)}')

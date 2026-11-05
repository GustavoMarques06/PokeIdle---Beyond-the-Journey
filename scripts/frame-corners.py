# Converte os ornamentos de canto das molduras do cartão (gerados por IA, fundo magenta ou cinza
# liso) em PNG transparente de 32×32.
#   Entrada: art/frames/<moldura>.jpg|png   (bronze, silver, gold, platinum — o canto de cima à esquerda)
#   Saída:   public/sprites/frames/<moldura>.png
# Uso: python scripts/frame-corners.py   (requer Pillow)

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'frames'
OUT = ROOT / 'public' / 'sprites' / 'frames'
SIZE = 32

MAGENTA = (255, 0, 255)
# Distância de cor até a qual o pixel é fundo (0) e a partir da qual é ornamento (opaco).
SOFT = (45, 120)


def dominant(im: Image.Image) -> tuple[int, int, int]:
    """Cor mais comum (o fundo chapado), numa versão reduzida para ignorar ruído do JPG."""
    small = im.resize((128, 128), Image.Resampling.NEAREST)
    return max(small.getcolors(128 * 128), key=lambda c: c[0])[1]


def magenta_share(im: Image.Image) -> float:
    small = im.resize((128, 128), Image.Resampling.NEAREST)
    near = sum(n for n, c in small.getcolors(128 * 128) if c[0] > 200 and c[2] > 200 and c[1] < 60)
    return near / (128 * 128)


def key_out(im: Image.Image) -> Image.Image:
    """Fundo → transparente; nas bordas, tira a cor do fundo que o JPG misturou (despill)."""
    keys = [MAGENTA]
    # Fundo cinza só quando a imagem quase não tem magenta (senão a cor mais comum pode ser o
    # próprio efeito, como as nuvens da neblina).
    magenta_bg = magenta_share(im) > 0.15
    if not magenta_bg:
        keys.append(dominant(im))
    lo, hi = SOFT
    src = im.load()
    out = Image.new('RGBA', im.size)
    dst = out.load()
    for y in range(im.height):
        for x in range(im.width):
            c = src[x, y]
            # O fundo mais próximo decide a transparência.
            key = min(keys, key=lambda k: sum((a - b) ** 2 for a, b in zip(c, k)))
            d = sum((a - b) ** 2 for a, b in zip(c, key)) ** 0.5
            a = min(1.0, max(0.0, (d - lo) / (hi - lo)))
            if a <= 0:
                dst[x, y] = (0, 0, 0, 0)
                continue
            # Desfaz a mistura com o fundo: c = a·cor + (1−a)·fundo.
            r, g, b = (max(0, min(255, round((v - (1 - a) * k) / a))) for v, k in zip(c, key))
            if magenta_bg:
                # Sobra rosa do JPG: nenhum efeito de fundo magenta é rosa de verdade.
                g_ref = max(g, 1)
                r = min(r, max(g_ref + 60, int(r * 0.85)))
                b = min(b, g_ref + 12)
                # Pixels que ainda são "quase magenta" viram fundo.
                if r > 180 and b > 150 and g < 90:
                    dst[x, y] = (0, 0, 0, 0)
                    continue
            dst[x, y] = (r, g, b, round(a * 255))
    return out

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(SRC.glob('*.jpg')) + sorted(SRC.glob('*.png')):
        rgba = key_out(Image.open(src).convert('RGB'))
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

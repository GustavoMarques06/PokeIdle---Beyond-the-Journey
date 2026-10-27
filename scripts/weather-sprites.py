# Converte as artes de clima (folhas de 4 quadros geradas por IA, em JPG com fundo chapado)
# em PNG transparente para a cena de batalha.
#   Entrada: art/weather/<nome>.jpg  (fundo magenta #FF00FF ou cinza liso; linhas magenta
#            entre os quadros também somem)
#   Saída:   public/sprites/weather/<nome>.png  (4 quadros de 512×288 lado a lado)
# Uso: python scripts/weather-sprites.py   (requer Pillow)

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'weather'
OUT = ROOT / 'public' / 'sprites' / 'weather'

FRAMES = 4
FRAME_SIZE = (512, 288)
# A IA nem sempre divide a folha em partes iguais: cortes medidos (x de cada divisa) por arquivo.
# Sem entrada aqui, a folha é dividida em FRAMES partes iguais.
CUTS: dict[str, list[int]] = {
    'fog': [0, 563, 1111, 1657, 2205, 2768],
    'hail': [0, 682, 1383, 2072, 2768],
    'sandstorm': [0, 686, 1386, 2075, 2768],
}
MAGENTA = (255, 0, 255)
# Distância de cor até a qual o pixel é fundo (0) e a partir da qual é efeito (opaco).
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


def sheet(path: Path) -> Image.Image:
    im = Image.open(path).convert('RGB')
    rgba = key_out(im)
    cuts = CUTS.get(path.stem) or [round(i * im.width / FRAMES) for i in range(FRAMES + 1)]
    count = len(cuts) - 1
    out = Image.new('RGBA', (FRAME_SIZE[0] * count, FRAME_SIZE[1]))
    for i in range(count):
        # Corta 3 px de cada lado: a linha divisória entre os quadros.
        frame = rgba.crop((cuts[i] + 3, 3, cuts[i + 1] - 3, im.height - 3))
        # Redimensiona com alfa pré-multiplicado para não criar halo escuro.
        frame = frame.convert('RGBa').resize(FRAME_SIZE, Image.Resampling.BOX).convert('RGBA')
        out.paste(frame, (i * FRAME_SIZE[0], 0))
    return out


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(SRC.glob('*.jpg')) + sorted(SRC.glob('*.png')):
        name = 'sand' if src.stem == 'sandstorm' else src.stem
        sheet(src).save(OUT / f'{name}.png', optimize=True)
        print(f'{src.name} -> public/sprites/weather/{name}.png')

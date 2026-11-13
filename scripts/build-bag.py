# Mochila em pixel art para a tela MOCHILA: uma mochila de aventureiro (alça, aba com fivela, bolso da frente e
# alças laterais), uma cor por bolso, lado a lado numa folha só (public/sprites/ui/bag.png, quadros de 40×44).
# A tela mostra o quadro do bolso aberto ampliado 2× (ou 3×), sem suavizar.
# Uso: python scripts/build-bag.py  (requer Pillow)

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'sprites' / 'ui' / 'bag.png'
W, H = 40, 44

# Ordem dos bolsos (a mesma de POCKETS em BagScreen.tsx): cor principal de cada um.
POCKETS = [
    ('items', (224, 80, 64)),
    ('balls', (72, 120, 208)),
    ('medicine', (88, 176, 72)),
    ('stones', (144, 96, 200)),
    ('held', (232, 144, 48)),
    ('tms', (56, 168, 168)),
    ('key', (200, 160, 64)),
]

INK = (40, 48, 80, 255)
GOLD = (248, 208, 72, 255)
GOLD_DARK = (176, 128, 40, 255)


def shade(c, k):
    return tuple(max(0, min(255, round(v * k))) for v in c) + (255,)


def rounded(x0, y0, x1, y1, r):
    """Pontos de um retângulo de cantos arredondados (inclusivo)."""
    pts = set()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            dx = max(x0 + r - x, 0, x - (x1 - r))
            dy = max(y0 + r - y, 0, y - (y1 - r))
            if dx * dx + dy * dy <= r * r + 1:
                pts.add((x, y))
    return pts


def draw(color):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = img.load()
    base = color + (255,)
    light = shade(color, 1.25)
    dark = shade(color, 0.72)
    darker = shade(color, 0.55)

    body = rounded(5, 13, 34, 42, 5)
    flap = rounded(6, 8, 33, 22, 5)
    pocket = rounded(11, 27, 28, 39, 3)
    handle = {(x, y) for x in range(14, 26) for y in range(2, 9)} - {(x, y) for x in range(16, 24) for y in range(4, 9)}
    handle -= {(14, 2), (25, 2)}

    # Corpo: claro à esquerda, escuro à direita e embaixo.
    for x, y in body:
        px[x, y] = light if x <= 8 else dark if x >= 31 or y >= 40 else base
    # Alças laterais.
    for y in range(16, 41):
        px[5, y] = darker
        px[34, y] = darker
    # Bolso da frente, com a costura pontilhada.
    for x, y in pocket:
        px[x, y] = dark if y >= 37 else shade(color, 0.86)
    for x in range(13, 27, 2):
        px[x, 29] = shade(color, 1.1)
    # Aba de cima, um pouco mais clara, com a borda de baixo escura.
    for x, y in flap:
        px[x, y] = shade(color, 1.12) if y <= 11 else base
    for x in range(7, 33):
        px[x, 22] = darker
    # Alça de mão.
    for x, y in handle:
        px[x, y] = darker
    # Fivela dourada na aba.
    for x in range(17, 23):
        for y in range(19, 25):
            edge = x in (17, 22) or y in (19, 24)
            px[x, y] = GOLD_DARK if edge else GOLD
    px[19, 21] = (255, 248, 200, 255)

    # Contorno de 1 px em tudo que foi desenhado.
    filled = {(x, y) for x in range(W) for y in range(H) if px[x, y][3]}
    for x, y in list(filled):
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in filled:
                px[nx, ny] = INK
    # Brilho na aba.
    for x in range(10, 15):
        px[x, 10] = (255, 255, 255, 170)
    return img


sheet = Image.new('RGBA', (W * len(POCKETS), H), (0, 0, 0, 0))
for i, (_, color) in enumerate(POCKETS):
    sheet.paste(draw(color), (i * W, 0))
OUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUT)
print(f'{OUT.relative_to(ROOT)}: {len(POCKETS)} quadros de {W}×{H}')

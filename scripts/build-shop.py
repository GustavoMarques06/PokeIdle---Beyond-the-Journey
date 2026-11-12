"""Cenas da Loja em pixel art (450x120, mostradas em 2x = 900x240, como os cenários de batalha).

Cada loja tem duas camadas: o fundo (parede, piso, prateleiras, porta) e a frente (balcão e vasos), para o vendedor
(sprite de 80 px mostrado em 2x) ficar entre as duas, aparecendo da cintura para cima. Os produtos das prateleiras
são miniaturas desenhadas aqui (bolas, frascos, caixas, pedras), no mesmo tamanho de pixel da cena.

    python scripts/build-shop.py

Gera public/sprites/shop/<loja>-back.png e <loja>-front.png para mart, dept e road (o mercador; road-night-back à
noite). A tela (ShopScreen.tsx) centraliza a cena: em telas estreitas as laterais ficam de fora, e o balcão e o
vendedor ficam no meio (x 160-290). A faixa de baixo (y 100-120) é piso livre: a caixa de texto fica por cima dela.
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'sprites' / 'shop'
W, H = 450, 120
WALL = 64  # onde a parede encontra o piso
K = (40, 32, 48, 255)  # contorno


def rgb(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def shade(c, d):
    return tuple(max(0, min(255, v + d)) for v in c[:3]) + (c[3],)


def rect(d, x, y, w, h, c):
    if w > 0 and h > 0:
        d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)


def box(d, x, y, w, h, fill, line=K):
    rect(d, x, y, w, h, line)
    rect(d, x + 1, y + 1, w - 2, h - 2, fill)


def dither(d, x, y, w, h, a, b):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            d.point((xx, yy), a if (xx + yy) % 2 else b)


def pattern(img, x, y, rows, pal):
    """Desenha uma grade de caracteres ('.' = vazio) com a paleta."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                img.putpixel((x + i, y + j), pal[ch])


def shadow(img, x, y, w, h, alpha=70):
    sh = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([0, 0, w - 1, h - 1], fill=(20, 16, 30, alpha))
    img.alpha_composite(sh, (x, y))


# --- Miniaturas dos produtos (9 px de altura) ------------------------------------------------------

BALL = [
    '...kkk...',
    '.kkTTTkk.',
    '.kTTwTTk.',
    'kTTTTTTTk',
    'kkkkWkkkk',
    'kBBBBBBBk',
    '.kBBBBBk.',
    '.kkBBBkk.',
    '...kkk...',
]
BALLS = {
    'poke': ('#e83838', '#f8f8f8'),
    'great': ('#3878e0', '#f8f8f8'),
    'ultra': ('#383838', '#f8f8f8'),
    'net': ('#38a8a8', '#f8f8f8'),
    'heal': ('#f070b0', '#f8f8f8'),
    'nest': ('#88c838', '#f8e8a0'),
    'dusk': ('#307030', '#383838'),
    'premier': ('#f8f8f8', '#f8f8f8'),
    'quick': ('#3858c8', '#f8d030'),
    'luxury': ('#383838', '#383838'),
}

BOTTLE = [
    '..kkk..',
    '..kck..',
    '.kkkkk.',
    'kLwLLLk',
    'kLwLLLk',
    'kLLLLLk',
    'kLLLLLk',
    'kDDDDDk',
    '.kkkkk.',
]

BOX = [
    'kkkkkkkk',
    'kPPPPPPk',
    'kPwPPPPk',
    'kSSSSSSk',
    'kPPPPPPk',
    'kPPPPPPk',
    'kDDDDDDk',
    'kkkkkkkk',
]

STONE = [
    '...kk...',
    '..kSwk..',
    '.kSSwSk.',
    'kSSSSSSk',
    'kSSSSSDk',
    '.kSSSDk.',
    '..kDDk..',
    '...kk...',
]


def ball(img, x, y, kind):
    top, bot = BALLS[kind]
    pal = {'k': K, 'T': rgb(top), 'B': rgb(bot), 'w': (255, 255, 255, 255), 'W': (248, 248, 248, 255)}
    if kind == 'ultra':
        pal['w'] = rgb('#f8d030')
    pattern(img, x, y, BALL, pal)


def bottle(img, x, y, liquid):
    pal = {'k': K, 'c': rgb('#a8b0c0'), 'L': rgb(liquid), 'D': shade(rgb(liquid), -50), 'w': (255, 255, 255, 220)}
    pattern(img, x, y, BOTTLE, pal)


def package(img, x, y, color, stripe):
    pal = {'k': K, 'P': rgb(color), 'S': rgb(stripe), 'D': shade(rgb(color), -50), 'w': (255, 255, 255, 200)}
    pattern(img, x, y + 1, BOX, pal)


def stone(img, x, y, color):
    pal = {'k': K, 'S': rgb(color), 'D': shade(rgb(color), -60), 'w': (255, 255, 255, 230)}
    pattern(img, x, y + 1, STONE, pal)


def coin(img, x, y, color='#f8c830'):
    d = ImageDraw.Draw(img)
    d.ellipse([x, y + 1, x + 7, y + 8], fill=K)
    d.ellipse([x + 1, y + 2, x + 6, y + 7], fill=rgb(color))
    img.putpixel((x + 2, y + 3), (255, 255, 255, 255))


# --- Peças da cena ----------------------------------------------------------------------------------


def wall(img, top, paper, paper_b, wains, wains_dark):
    d = ImageDraw.Draw(img)
    rect(d, 0, 0, W, WALL, rgb(paper))
    for x in range(0, W, 12):
        rect(d, x + 6, 10, 6, WALL, rgb(paper_b))
    rect(d, 0, 0, W, 8, rgb(top))
    rect(d, 0, 1, W, 1, shade(rgb(top), 40))
    rect(d, 0, 8, W, 2, shade(rgb(top), -50))
    rect(d, 0, 10, W, 1, (0, 0, 0, 40))
    rect(d, 0, 48, W, WALL - 48, rgb(wains))
    rect(d, 0, 48, W, 1, (255, 255, 255, 255))
    rect(d, 0, 49, W, 1, rgb(wains_dark))
    for x in range(0, W, 30):
        rect(d, x, 51, 1, 9, rgb(wains_dark))
        rect(d, x + 1, 51, 1, 9, shade(rgb(wains), 30))
    rect(d, 0, WALL - 3, W, 3, rgb(wains_dark))
    rect(d, 0, WALL - 3, W, 1, K)


def floor(img, a, b, grout):
    d = ImageDraw.Draw(img)
    for row, y in enumerate(range(WALL, H, 8)):
        for col, x in enumerate(range(0, W, 16)):
            rect(d, x, y, 16, 8, rgb(a) if (col + row) % 2 else rgb(b))
            rect(d, x, y, 16, 1, rgb(grout))
            rect(d, x, y, 1, 8, rgb(grout))
            rect(d, x + 2, y + 2, 3, 1, (255, 255, 255, 130))
    sh = Image.new('RGBA', (W, 6), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    for i in range(6):
        rect(sd, 0, i, W, 1, (20, 16, 30, 70 - i * 11))
    img.alpha_composite(sh, (0, WALL))


def shelf(img, x, y, w, rows, draw_row, wood='#8a5a30', back='#c89860'):
    d = ImageDraw.Draw(img)
    h = WALL + 2 - y
    shadow(img, x - 3, WALL - 1, w + 6, 6, 80)
    d = ImageDraw.Draw(img)
    box(d, x, y, w, h, rgb(wood))
    rect(d, x + 3, y + 3, w - 6, h - 5, rgb(back))
    for xx in range(x + 3, x + w - 3, 5):
        rect(d, xx, y + 3, 1, h - 5, shade(rgb(back), -16))
    rect(d, x + 1, y + 1, w - 2, 1, shade(rgb(wood), 50))
    rect(d, x + 1, y + 1, 1, h - 2, shade(rgb(wood), 30))
    gap = (h - 5) // rows
    for r in range(rows):
        by = y + 3 + gap * (r + 1) - 3
        rect(d, x + 3, by - gap + 3, w - 6, 2, (0, 0, 0, 50))
        draw_row(img, x + 6, by, w - 12, r)
        d = ImageDraw.Draw(img)
        rect(d, x + 2, by, w - 4, 3, rgb('#a06838'))
        rect(d, x + 2, by, w - 4, 1, rgb('#e0a868'))
        rect(d, x + 2, by + 2, w - 4, 1, rgb('#583418'))


def window(img, x, y, w, h):
    d = ImageDraw.Draw(img)
    box(d, x - 2, y - 2, w + 4, h + 4, rgb('#f8f8f8'))
    rect(d, x, y, w, h, rgb('#b8e0ff'))
    rect(d, x, y, w, h // 2, rgb('#78b8f0'))
    dither(d, x, y + h // 2 - 1, w, 2, rgb('#78b8f0'), rgb('#b8e0ff'))
    for i in range(w):
        hh = 3 + int(2 * abs(((i * 7) % 20) - 10) / 10)
        rect(d, x + i, y + h - hh, 1, hh, rgb('#58a048'))
    rect(d, x + 5, y + 4, 10, 3, rgb('#ffffff'))
    rect(d, x + 7, y + 3, 5, 1, rgb('#ffffff'))
    rect(d, x + w // 2, y, 2, h, rgb('#f8f8f8'))
    rect(d, x, y + h // 2, w, 2, rgb('#f8f8f8'))
    rect(d, x + 1, y + 1, 1, h // 2 - 2, (255, 255, 255, 150))


def door(img, x, y, w, h):
    d = ImageDraw.Draw(img)
    box(d, x - 3, y - 3, w + 6, h + 3, rgb('#687888'))
    rect(d, x - 2, y - 2, w + 4, 1, rgb('#98a8b8'))
    rect(d, x, y, w, h, rgb('#a8d8f8'))
    dither(d, x, y + h - 10, w, 10, rgb('#a8d8f8'), rgb('#88c060'))
    rect(d, x, y + h - 5, w, 5, rgb('#78b050'))
    rect(d, x - 4, WALL + 1, w + 8, 3, rgb('#3858a8'))
    rect(d, x - 4, WALL + 1, w + 8, 1, rgb('#5878c8'))


def elevator(img, x, y, w, h):
    d = ImageDraw.Draw(img)
    box(d, x - 3, y - 9, w + 6, h + 9, rgb('#8898a8'))
    rect(d, x - 2, y - 8, w + 4, 1, rgb('#c8d0d8'))
    rect(d, x, y - 7, w, 5, rgb('#203028'))
    rect(d, x, y, w, h, rgb('#303840'))
    rect(d, x + w + 5, y + 16, 4, 7, rgb('#c8d0d8'))
    img.putpixel((x + w + 6, y + 17), rgb('#f8d030'))
    img.putpixel((x + w + 6, y + 20), rgb('#f8d030'))


def plant(img, x, ground):
    shadow(img, x - 2, ground - 3, 18, 5, 90)
    d = ImageDraw.Draw(img)
    leaves = [(-5, -18, 4, 15), (-1, -23, 4, 20), (3, -20, 4, 17), (7, -16, 4, 13), (-8, -13, 4, 10), (10, -11, 4, 8)]
    for dx, dy, lw, lh in leaves:
        d.ellipse([x + 6 + dx - 1, ground - 13 + dy - 1, x + 6 + dx + lw, ground - 13 + dy + lh], fill=K)
    for dx, dy, lw, lh in leaves:
        d.ellipse([x + 6 + dx, ground - 13 + dy, x + 6 + dx + lw - 1, ground - 13 + dy + lh - 1], fill=rgb('#48a048'))
        rect(d, x + 6 + dx + 1, ground - 13 + dy + 2, 1, lh - 4, rgb('#78c860'))
    box(d, x, ground - 13, 14, 13, rgb('#c06838'))
    rect(d, x - 1, ground - 14, 16, 3, K)
    rect(d, x, ground - 14, 14, 2, rgb('#e08850'))
    rect(d, x + 2, ground - 10, 2, 8, rgb('#e08850'))


def counter(img, x, y, w, ground, top='#e0a868', face='#b87838'):
    shadow(img, x - 4, ground - 3, w + 8, 7, 90)
    d = ImageDraw.Draw(img)
    h = ground - y
    box(d, x, y + 5, w, h - 5, rgb(face))
    for xx in range(x + 10, x + w - 2, 10):
        rect(d, xx, y + 6, 1, h - 10, shade(rgb(face), -40))
        rect(d, xx + 1, y + 6, 1, h - 10, shade(rgb(face), 24))
    rect(d, x + 1, ground - 4, w - 2, 3, shade(rgb(face), -60))
    box(d, x - 3, y, w + 6, 7, rgb(top))
    rect(d, x - 2, y + 1, w + 4, 1, shade(rgb(top), 40))
    rect(d, x - 2, y + 5, w + 4, 1, shade(rgb(top), -50))
    # Emblema da Poké Ball na frente.
    cx, cy, r = x + w // 2, y + 5 + (h - 5) // 2, 7
    d.ellipse([cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], fill=K)
    d.pieslice([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=rgb('#e83838'))
    d.pieslice([cx - r, cy - r, cx + r, cy + r], 0, 180, fill=rgb('#f8f8f8'))
    rect(d, cx - r, cy, 2 * r + 1, 1, K)
    d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=K)
    img.putpixel((cx, cy), rgb('#f8f8f8'))
    rect(d, cx - 4, cy - 5, 2, 1, (255, 255, 255, 220))


def save(img, name):
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f'{name}.png', optimize=True)
    print('ok', name)


# --- As lojas -----------------------------------------------------------------------------------------


def mart():
    img = Image.new('RGBA', (W, H))
    wall(img, '#3858a8', '#f4f0e4', '#ece6d6', '#a8bcd8', '#6880a8')
    floor(img, '#ece8dc', '#dcd6c8', '#c4bcac')
    kinds = list(BALLS)

    def balls_row(im, x, by, w, r):
        for i, xx in enumerate(range(x, x + w - 8, 11)):
            ball(im, xx, by - 9, kinds[(i + r * 3) % len(kinds)])

    def meds_row(im, x, by, w, r):
        for i, xx in enumerate(range(x, x + w - 7, 10)):
            if r == 0:
                bottle(im, xx, by - 9, ['#a060d0', '#5890e0', '#e05870', '#58c070'][i % 4])
            else:
                package(im, xx, by - 9, ['#f8d030', '#58b0e0', '#e86848'][i % 3], '#f8f8f8')

    shelf(img, 8, 14, 124, 3, balls_row)
    window(img, 146, 16, 40, 24)
    shelf(img, 318, 14, 66, 3, meds_row)
    door(img, 398, 20, 40, WALL - 20)
    d = ImageDraw.Draw(img)
    rect(d, 178, 100, 94, 8, rgb('#c84848'))
    rect(d, 178, 100, 94, 1, rgb('#e86868'))
    dither(d, 178, 102, 94, 1, rgb('#c84848'), rgb('#f8d030'))
    save(img, 'mart-back')

    front = Image.new('RGBA', (W, H))
    counter(front, 160, 60, 130, 98)
    plant(front, 136, 98)
    plant(front, 302, 98)
    save(front, 'mart-front')


def dept():
    img = Image.new('RGBA', (W, H))
    wall(img, '#c84848', '#f8ecd8', '#f0e0c8', '#d8b8a0', '#a07860')
    floor(img, '#e4ecf4', '#ccd8e4', '#b4c0cc')
    stones = ['#f87830', '#4890e8', '#f8d030', '#58b848', '#a080d0', '#f8a0c0', '#a8e0f8']

    def stones_row(im, x, by, w, r):
        for i, xx in enumerate(range(x, x + w - 8, 11)):
            stone(im, xx, by - 9, stones[(i + r * 2) % len(stones)])

    def held_row(im, x, by, w, r):
        for i, xx in enumerate(range(x, x + w - 8, 11)):
            if (i + r) % 2:
                package(im, xx, by - 9, ['#e05870', '#8060c0', '#38a8a8'][i % 3], '#f8d030')
            else:
                bottle(im, xx, by - 9, ['#f8a030', '#68c8f8', '#c060c0'][i % 3])

    shelf(img, 8, 14, 124, 3, stones_row, wood='#6a4a6a', back='#b898b8')
    window(img, 146, 16, 40, 24)
    shelf(img, 314, 14, 70, 3, held_row, wood='#6a4a6a', back='#b898b8')
    elevator(img, 398, 26, 36, WALL - 26)
    d = ImageDraw.Draw(img)
    rect(d, 178, 100, 94, 8, rgb('#3858a8'))
    rect(d, 178, 100, 94, 1, rgb('#5878c8'))
    dither(d, 178, 102, 94, 1, rgb('#3858a8'), rgb('#f8d030'))
    save(img, 'dept-back')

    front = Image.new('RGBA', (W, H))
    counter(front, 160, 60, 130, 98, top='#d8d0e0', face='#8878a8')
    plant(front, 136, 98)
    plant(front, 302, 98)
    save(front, 'dept-front')


def road(night):
    img = Image.new('RGBA', (W, H))
    d = ImageDraw.Draw(img)
    bands = (
        ['#101838', '#182048', '#202a58', '#2a3468', '#343e78']
        if night
        else ['#68b0f0', '#78bcf4', '#88c8f8', '#a0d4fa', '#b8e0fc']
    )
    for i, c in enumerate(bands):
        rect(d, 0, i * 13, W, 13, rgb(c))
        if i:
            dither(d, 0, i * 13 - 1, W, 2, rgb(bands[i - 1]), rgb(c))
    if night:
        for i in range(50):
            d.point(((i * 137) % W, (i * 53) % 54), rgb('#f8f8d0') if i % 3 else rgb('#a0b0f0'))
        d.ellipse([360, 8, 376, 24], fill=rgb('#f8f0c8'))
        d.ellipse([366, 7, 380, 21], fill=rgb(bands[0]))
    else:
        for cx, cy in [(40, 12), (250, 6), (380, 18)]:
            for dx, dy, w, h in [(0, 3, 30, 6), (6, 0, 15, 5), (17, 1, 10, 4)]:
                rect(d, cx + dx, cy + dy, w, h, rgb('#ffffff'))
            rect(d, cx, cy + 8, 30, 1, rgb('#d8e8f8'))
    far, near, grass, grass_d = (
        ('#284838', '#305838', '#2c5030', '#203c24') if night else ('#78b8a0', '#68b058', '#78c058', '#58a040')
    )
    for x in range(W):
        h1 = 9 + int(6 * abs(((x * 3) % 110) - 55) / 55)
        rect(d, x, 56 - h1, 1, h1, rgb(far))
        h2 = 5 + int(5 * abs(((x * 5 + 45) % 130) - 65) / 65)
        rect(d, x, 62 - h2, 1, h2, rgb(near))
    rect(d, 0, 60, W, H - 60, rgb(grass))
    dither(d, 0, 59, W, 2, rgb(near), rgb(grass))
    for i in range(90):
        x, y = (i * 97) % W, 64 + (i * 31) % 54
        rect(d, x, y, 1, 2, rgb(grass_d))
    path, path_d = ('#8a6a48', '#6a5038') if night else ('#d8b880', '#c0a068')
    rect(d, 0, 98, W, 12, rgb(path))
    dither(d, 0, 97, W, 1, rgb(grass), rgb(path))
    dither(d, 0, 110, W, 1, rgb(path), rgb(grass))
    for i in range(30):
        rect(d, (i * 71) % W, 100 + (i * 13) % 8, 2, 1, rgb(path_d))
    # A carroça com toldo e mercadorias, atrás do mercador.
    wx, wy, ww = 160, 50, 130
    shadow(img, wx - 3, 92, ww + 6, 7, 90)
    d = ImageDraw.Draw(img)
    box(d, wx, wy, ww, 40, rgb('#a06838'))
    for xx in range(wx + 10, wx + ww - 2, 11):
        rect(d, xx, wy + 1, 1, 38, rgb('#7a4a22'))
        rect(d, xx + 1, wy + 1, 1, 38, rgb('#c08850'))
    rect(d, wx + 1, wy + 1, ww - 2, 1, rgb('#d09058'))
    for i, xx in enumerate(range(wx + 6, wx + ww - 8, 12)):
        if i % 3 == 0:
            coin(img, xx, wy - 9)
        elif i % 3 == 1:
            stone(img, xx, wy - 9, '#f8a0c0')
        else:
            ball(img, xx, wy - 9, ['poke', 'great', 'ultra'][i % 3])
    d = ImageDraw.Draw(img)
    for px in (wx + 3, wx + ww - 6):
        rect(d, px, 18, 3, wy - 18, K)
        rect(d, px + 1, 18, 1, wy - 18, rgb('#8a5a30'))
    for i, xx in enumerate(range(wx - 8, wx + ww + 8, 10)):
        c = rgb('#d84838') if i % 2 == 0 else rgb('#f8f0e0')
        rect(d, xx, 14, 10, 13, c)
        d.pieslice([xx, 22, xx + 9, 32], 0, 180, fill=c)
    rect(d, wx - 8, 13, ww + 16, 2, K)
    rect(d, wx - 8, 15, ww + 16, 1, (255, 255, 255, 120))
    for wxx in (wx + 14, wx + ww - 34):
        d.ellipse([wxx - 1, 80, wxx + 19, 100], fill=K)
        d.ellipse([wxx + 1, 82, wxx + 17, 98], fill=rgb('#c89860'))
        d.ellipse([wxx + 5, 86, wxx + 13, 94], fill=rgb('#a07040'))
        for a in range(0, 360, 45):
            img.putpixel((wxx + 9 + int(6 * math.cos(math.radians(a))), 90 + int(6 * math.sin(math.radians(a)))), K)
        d.ellipse([wxx + 7, 88, wxx + 11, 92], fill=K)
    for bx in (122, 308):
        shadow(img, bx - 2, 94, 24, 5, 90)
        d = ImageDraw.Draw(img)
        box(d, bx, 76, 20, 18, rgb('#b88850'))
        rect(d, bx + 1, 77, 18, 1, rgb('#e0b070'))
        d.line([bx + 1, 77, bx + 18, 92], fill=rgb('#805828'))
        d.line([bx + 18, 77, bx + 1, 92], fill=rgb('#805828'))
    return img


def merchant():
    save(road(False), 'road-back')
    save(road(True), 'road-night-back')
    front = Image.new('RGBA', (W, H))
    d = ImageDraw.Draw(front)
    box(d, 176, 82, 98, 18, rgb('#8a5a30'))
    rect(d, 177, 83, 96, 1, rgb('#c08850'))
    for xx in range(186, 272, 12):
        rect(d, xx, 84, 1, 16, rgb('#6a4020'))
    save(front, 'road-front')


if __name__ == '__main__':
    mart()
    dept()
    merchant()

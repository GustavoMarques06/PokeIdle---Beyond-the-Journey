"""Cenas da Loja em pixel art (900x200, 1 pixel = 1 pixel de tela, como os sprites do jogo).

Cada loja tem duas camadas: o fundo (parede, piso, prateleiras, porta) e a frente (balcão, vasos), para o vendedor
ficar entre as duas. As prateleiras usam os sprites reais dos itens (public/sprites/items).

    python scripts/build-shop.py

Gera public/sprites/shop/<loja>-back.png e <loja>-front.png para mart, dept e road (o mercador; road-night-back à
noite). A tela (ShopScreen.tsx) centraliza a cena: em telas estreitas as laterais ficam de fora, então o balcão e o
vendedor ficam no meio (x 330-610).
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ITEMS = ROOT / 'public' / 'sprites' / 'items'
OUT = ROOT / 'public' / 'sprites' / 'shop'
W, H = 900, 200
WALL = 132  # onde a parede encontra o piso
INK = (40, 32, 48, 255)


def rgb(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def rect(d, x, y, w, h, c):
    if w > 0 and h > 0:
        d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)


def box(d, x, y, w, h, fill, line=INK):
    rect(d, x, y, w, h, line)
    rect(d, x + 1, y + 1, w - 2, h - 2, fill)


def dither(d, x, y, w, h, a, b):
    """Faixa em xadrez de dois tons (a transição de cor dos jogos de portátil)."""
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            d.point((xx, yy), a if (xx + yy) % 2 else b)


def item(name):
    im = Image.open(ITEMS / f'{name}.png').convert('RGBA')
    bb = im.getbbox()
    return im.crop(bb) if bb else im


def shadow(img, x, y, w, h, alpha=60):
    sh = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([0, 0, w - 1, h - 1], fill=(20, 16, 30, alpha))
    img.alpha_composite(sh, (x, y))


# --- Peças --------------------------------------------------------------------------------------


def wall(img, top, top_dark, paper, paper_b, wains, wains_dark):
    d = ImageDraw.Draw(img)
    rect(d, 0, 0, W, WALL, rgb(paper))
    for x in range(0, W, 24):
        rect(d, x + 12, 20, 12, WALL, rgb(paper_b))
    # Faixa do alto com brilho e sombra.
    rect(d, 0, 0, W, 16, rgb(top))
    rect(d, 0, 1, W, 1, tuple(min(255, c + 40) for c in rgb(top)[:3]) + (255,))
    rect(d, 0, 16, W, 3, rgb(top_dark))
    rect(d, 0, 19, W, 2, (0, 0, 0, 40))
    # Lambri: painéis com friso claro em cima e rodapé escuro.
    rect(d, 0, 100, W, WALL - 100, rgb(wains))
    rect(d, 0, 100, W, 2, (255, 255, 255, 255))
    rect(d, 0, 102, W, 1, rgb(wains_dark))
    for x in range(0, W, 60):
        rect(d, x, 106, 1, 20, rgb(wains_dark))
        rect(d, x + 1, 106, 1, 20, tuple(min(255, c + 30) for c in rgb(wains)[:3]) + (255,))
    rect(d, 0, WALL - 5, W, 5, rgb(wains_dark))
    rect(d, 0, WALL - 5, W, 1, INK)


def floor(img, a, b, grout):
    d = ImageDraw.Draw(img)
    # Ladrilhos quadriculados, com rejunte e um brilho no canto de cada um.
    for row, y in enumerate(range(WALL, H, 14)):
        for col, x in enumerate(range(0, W, 28)):
            rect(d, x, y, 28, 14, rgb(a) if (col + row) % 2 else rgb(b))
            rect(d, x, y, 28, 1, rgb(grout))
            rect(d, x, y, 1, 14, rgb(grout))
            rect(d, x + 2, y + 2, 4, 1, (255, 255, 255, 140))
    # Sombra da parede no chão.
    sh = Image.new('RGBA', (W, 10), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    for i in range(10):
        rect(sd, 0, i, W, 1, (20, 16, 30, 60 - i * 6))
    img.alpha_composite(sh, (0, WALL))


def shelf(img, x, y, w, rows, goods, wood='#8a5a30', back='#c89860'):
    """Estante com tábuas e produtos (sprites reais) em cima de cada uma."""
    d = ImageDraw.Draw(img)
    h = WALL + 4 - y
    shadow(img, x - 6, WALL - 2, w + 12, 12, 70)
    box(d, x, y, w, h, rgb(wood))
    rect(d, x + 6, y + 6, w - 12, h - 10, rgb(back))
    # Fundo da estante: listras de madeira e sombra no alto de cada vão.
    for xx in range(x + 6, x + w - 6, 8):
        rect(d, xx, y + 6, 1, h - 10, tuple(max(0, c - 18) for c in rgb(back)[:3]) + (255,))
    rect(d, x + 1, y + 1, w - 2, 1, tuple(min(255, c + 50) for c in rgb(wood)[:3]) + (255,))
    rect(d, x + 1, y + 1, 1, h - 2, tuple(min(255, c + 30) for c in rgb(wood)[:3]) + (255,))
    gap = (h - 10) // rows
    for r in range(rows):
        by = y + 6 + gap * (r + 1) - 5
        rect(d, x + 6, by - gap + 5, w - 12, 3, (0, 0, 0, 45))  # sombra do vão
        # Produtos sobre a tábua, encostados nela.
        cx = x + 10
        i = 0
        while cx < x + w - 14:
            spr = goods[(r * 3 + i) % len(goods)]
            if cx + spr.width > x + w - 8:
                break
            img.alpha_composite(spr, (cx, by - spr.height))
            cx += spr.width + 3
            i += 1
        d = ImageDraw.Draw(img)
        rect(d, x + 4, by, w - 8, 5, rgb('#a06838'))
        rect(d, x + 4, by, w - 8, 1, rgb('#e0a868'))
        rect(d, x + 4, by + 4, w - 8, 1, rgb('#583418'))
    rect(d, x, y + h - 1, w, 1, INK)


def window(img, x, y, w, h, night=False):
    d = ImageDraw.Draw(img)
    box(d, x - 4, y - 4, w + 8, h + 8, rgb('#f8f8f8'))
    sky_top, sky_bot = ('#283060', '#485890') if night else ('#78b8f0', '#b8e0ff')
    rect(d, x, y, w, h, rgb(sky_bot))
    rect(d, x, y, w, h // 2, rgb(sky_top))
    dither(d, x, y + h // 2 - 3, w, 6, rgb(sky_top), rgb(sky_bot))
    # Morrinhos e uma nuvem lá fora.
    for i in range(w):
        hh = 6 + int(4 * abs(((i * 7) % 40) - 20) / 20)
        rect(d, x + i, y + h - hh, 1, hh, rgb('#58a048'))
    rect(d, x + 14, y + 10, 22, 6, rgb('#ffffff'))
    rect(d, x + 18, y + 7, 12, 3, rgb('#ffffff'))
    rect(d, x + w // 2 - 1, y, 3, h, rgb('#f8f8f8'))
    rect(d, x, y + h // 2 - 1, w, 3, rgb('#f8f8f8'))
    rect(d, x + 3, y + 3, 2, h // 2 - 6, (255, 255, 255, 150))


def door(img, x, y, w, h):
    """Porta automática de vidro (as folhas que abrem ficam no HTML, por cima)."""
    d = ImageDraw.Draw(img)
    box(d, x - 5, y - 5, w + 10, h + 5, rgb('#687888'))
    rect(d, x - 4, y - 4, w + 8, 2, rgb('#98a8b8'))
    rect(d, x, y, w, h, rgb('#a8d8f8'))
    dither(d, x, y + h - 20, w, 20, rgb('#a8d8f8'), rgb('#88c060'))
    rect(d, x, y + h - 10, w, 10, rgb('#78b050'))
    # Tapete na entrada.
    rect(d, x - 8, WALL + 2, w + 16, 6, rgb('#3858a8'))
    rect(d, x - 8, WALL + 2, w + 16, 1, rgb('#5878c8'))


def elevator(img, x, y, w, h):
    d = ImageDraw.Draw(img)
    box(d, x - 6, y - 16, w + 12, h + 16, rgb('#8898a8'))
    rect(d, x - 5, y - 15, w + 10, 1, rgb('#c8d0d8'))
    rect(d, x - 2, y - 12, w + 4, 8, rgb('#203028'))  # visor do andar (luzes no HTML)
    rect(d, x, y, w, h, rgb('#303840'))
    rect(d, x + w + 10, y + 34, 6, 12, rgb('#c8d0d8'))  # botão
    rect(d, x + w + 11, y + 36, 4, 3, rgb('#f8d030'))
    rect(d, x + w + 11, y + 41, 4, 3, rgb('#f8d030'))


def plant(img, x, ground):
    d = ImageDraw.Draw(img)
    shadow(img, x - 4, ground - 4, 34, 8, 80)
    d = ImageDraw.Draw(img)
    # Folhas em leque, com contorno.
    leaves = [(-10, -36, 8, 30), (-2, -46, 8, 40), (6, -40, 8, 34), (14, -32, 8, 26), (-16, -26, 8, 20), (20, -22, 8, 16)]
    for dx, dy, lw, lh in leaves:
        d.ellipse([x + 13 + dx - 1, ground - 26 + dy - 1, x + 13 + dx + lw, ground - 26 + dy + lh], fill=INK)
    for dx, dy, lw, lh in leaves:
        d.ellipse([x + 13 + dx, ground - 26 + dy, x + 13 + dx + lw - 1, ground - 26 + dy + lh - 1], fill=rgb('#48a048'))
        rect(d, x + 13 + dx + 2, ground - 26 + dy + 3, 2, lh - 8, rgb('#78c860'))
    box(d, x, ground - 28, 26, 26, rgb('#c06838'))
    rect(d, x - 2, ground - 30, 30, 6, INK)
    rect(d, x - 1, ground - 29, 28, 4, rgb('#e08850'))
    rect(d, x + 3, ground - 22, 3, 16, rgb('#e08850'))


def counter(img, x, y, w, ground, top='#e0a868', face='#b87838', emblem=True):
    d = ImageDraw.Draw(img)
    shadow(img, x - 8, ground - 8, w + 16, 14, 80)
    d = ImageDraw.Draw(img)
    h = ground - y
    box(d, x, y + 10, w, h - 10, rgb(face))
    for xx in range(x + 18, x + w - 4, 20):
        rect(d, xx, y + 12, 1, h - 20, tuple(max(0, c - 40) for c in rgb(face)[:3]) + (255,))
        rect(d, xx + 1, y + 12, 1, h - 20, tuple(min(255, c + 24) for c in rgb(face)[:3]) + (255,))
    rect(d, x + 1, ground - 9, w - 2, 8, tuple(max(0, c - 60) for c in rgb(face)[:3]) + (255,))
    # Tampo: sobra um pouco para fora, com brilho na borda.
    box(d, x - 6, y, w + 12, 12, rgb(top))
    rect(d, x - 5, y + 1, w + 10, 2, tuple(min(255, c + 40) for c in rgb(top)[:3]) + (255,))
    rect(d, x - 5, y + 9, w + 10, 2, tuple(max(0, c - 50) for c in rgb(top)[:3]) + (255,))
    if emblem:
        cx, cy, r = x + w // 2, y + 10 + (h - 10) // 2, 13
        d.ellipse([cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], fill=INK)
        d.pieslice([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=rgb('#e83838'))
        d.pieslice([cx - r, cy - r, cx + r, cy + r], 0, 180, fill=rgb('#f8f8f8'))
        rect(d, cx - r, cy - 1, 2 * r + 1, 3, INK)
        d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=INK)
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=rgb('#f8f8f8'))
        rect(d, cx - 8, cy - 9, 4, 2, (255, 255, 255, 200))


def save(img, name):
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f'{name}.png', optimize=True)
    print('ok', name)


# --- Poké Mart -----------------------------------------------------------------------------------


def mart():
    back = Image.new('RGBA', (W, H))
    wall(back, '#3858a8', '#283878', '#f4f0e4', '#ece6d6', '#a8bcd8', '#6880a8')
    floor(back, '#ece8dc', '#dcd6c8', '#c4bcac')
    balls = [item(n) for n in ['poke-ball', 'great-ball', 'ultra-ball', 'net-ball', 'heal-ball', 'nest-ball', 'dusk-ball', 'quick-ball']]
    meds = [item(n) for n in ['potion', 'repel', 'super-repel', 'max-repel', 'escape-rope', 'oran-berry', 'pecha-berry']]
    shelf(back, 22, 34, 250, 3, balls)
    window(back, 404, 34, 92, 54)
    shelf(back, 610, 34, 150, 3, meds)
    door(back, 790, 40, 72, WALL - 40)
    # Tapete vermelho na frente do balcão.
    d = ImageDraw.Draw(back)
    rect(d, 360, 186, 220, 14, rgb('#c84848'))
    rect(d, 360, 186, 220, 2, rgb('#e86868'))
    dither(d, 360, 190, 220, 2, rgb('#c84848'), rgb('#f8d030'))
    save(back, 'mart-back')

    front = Image.new('RGBA', (W, H))
    counter(front, 336, 150, 268, 198)
    plant(front, 290, 198)
    plant(front, 630, 198)
    save(front, 'mart-front')


# --- Loja de Departamentos ------------------------------------------------------------------------


def dept():
    back = Image.new('RGBA', (W, H))
    wall(back, '#c84848', '#983030', '#f8ecd8', '#f0e0c8', '#d8b8a0', '#a07860')
    floor(back, '#e4ecf4', '#ccd8e4', '#b4c0cc')
    stones = [item(n) for n in ['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'sun-stone', 'ice-stone', 'dusk-stone']]
    held = [item(n) for n in ['choice-band', 'leftovers', 'life-orb', 'focus-sash', 'quick-claw', 'scope-lens', 'muscle-band', 'tm']]
    shelf(back, 22, 34, 250, 3, stones, wood='#6a4a6a', back='#b898b8')
    window(back, 404, 34, 92, 54)
    shelf(back, 600, 34, 160, 3, held, wood='#6a4a6a', back='#b898b8')
    elevator(back, 792, 50, 68, WALL - 50)
    d = ImageDraw.Draw(back)
    rect(d, 360, 186, 220, 14, rgb('#3858a8'))
    rect(d, 360, 186, 220, 2, rgb('#5878c8'))
    dither(d, 360, 190, 220, 2, rgb('#3858a8'), rgb('#f8d030'))
    save(back, 'dept-back')

    front = Image.new('RGBA', (W, H))
    counter(front, 336, 150, 268, 198, top='#d8d0e0', face='#8878a8')
    plant(front, 290, 198)
    plant(front, 630, 198)
    save(front, 'dept-front')


# --- Mercador na estrada (dia e noite) -------------------------------------------------------------


def road(night):
    img = Image.new('RGBA', (W, H))
    d = ImageDraw.Draw(img)
    if night:
        bands = ['#101838', '#182048', '#202a58', '#2a3468', '#343e78']
    else:
        bands = ['#68b0f0', '#78bcf4', '#88c8f8', '#a0d4fa', '#b8e0fc']
    bh = 24
    for i, c in enumerate(bands):
        rect(d, 0, i * bh, W, bh, rgb(c))
        if i:
            dither(d, 0, i * bh - 2, W, 4, rgb(bands[i - 1]), rgb(c))
    if night:
        for i in range(70):
            x, y = (i * 137) % W, (i * 53) % 100
            d.point((x, y), rgb('#f8f8d0') if i % 3 else rgb('#a0b0f0'))
        d.ellipse([700, 14, 730, 44], fill=rgb('#f8f0c8'))
        d.ellipse([710, 12, 736, 40], fill=rgb(bands[0]))
    else:
        for cx, cy in [(120, 30), (520, 18), (780, 40)]:
            for dx, dy, w, h in [(0, 6, 60, 12), (12, 0, 30, 10), (34, 2, 20, 8)]:
                rect(d, cx + dx, cy + dy, w, h, rgb('#ffffff'))
            rect(d, cx, cy + 16, 60, 2, rgb('#d8e8f8'))
    # Morros ao longe e a grama.
    far, near, grass, grass_d = (
        ('#284838', '#305838', '#2c5030', '#203c24') if night else ('#78b8a0', '#68b058', '#78c058', '#58a040')
    )
    for x in range(W):
        h1 = 18 + int(12 * abs(((x * 3) % 220) - 110) / 110)
        rect(d, x, 112 - h1, 1, h1, rgb(far))
        h2 = 10 + int(10 * abs(((x * 5 + 90) % 260) - 130) / 130)
        rect(d, x, 124 - h2, 1, h2, rgb(near))
    rect(d, 0, 120, W, H - 120, rgb(grass))
    dither(d, 0, 118, W, 4, rgb(near), rgb(grass))
    for i in range(160):
        x, y = (i * 97) % W, 128 + (i * 31) % 70
        rect(d, x, y, 1, 3, rgb(grass_d))
        rect(d, x + 2, y + 1, 1, 2, rgb(grass_d))
    # Estrada de terra.
    path = '#8a6a48' if night else '#d8b880'
    path_d = '#6a5038' if night else '#c0a068'
    rect(d, 0, 168, W, 22, rgb(path))
    dither(d, 0, 166, W, 2, rgb(grass), rgb(path))
    dither(d, 0, 190, W, 2, rgb(path), rgb(grass))
    for i in range(50):
        rect(d, (i * 71) % W, 172 + (i * 13) % 14, 2, 1, rgb(path_d))
    # A carroça (o toldo e a mercadoria) atrás do mercador.
    wx, wy, ww = 330, 100, 280
    shadow(img, wx - 6, 176, ww + 12, 14, 90)
    d = ImageDraw.Draw(img)
    box(d, wx, wy, ww, 66, rgb('#a06838'))
    for xx in range(wx + 16, wx + ww - 4, 22):
        rect(d, xx, wy + 2, 1, 62, rgb('#7a4a22'))
        rect(d, xx + 1, wy + 2, 1, 62, rgb('#c08850'))
    rect(d, wx + 1, wy + 1, ww - 2, 2, rgb('#d09058'))
    goods = [item(n) for n in ['amulet-coin', 'star-piece', 'nugget', 'shiny-charm', 'rare-candy', 'bottle-cap', 'lucky-egg']]
    cx = wx + 14
    for i, spr in enumerate(goods):
        img.alpha_composite(spr, (cx, wy - spr.height + 2))
        cx += spr.width + 12
    d = ImageDraw.Draw(img)
    for px in (wx + 6, wx + ww - 12):
        rect(d, px, 36, 6, wy - 36, INK)
        rect(d, px + 1, 36, 4, wy - 36, rgb('#8a5a30'))
    for i, xx in enumerate(range(wx - 16, wx + ww + 16, 20)):
        c = rgb('#d84838') if i % 2 == 0 else rgb('#f8f0e0')
        rect(d, xx, 28, 20, 26, c)
        d.pieslice([xx, 44, xx + 19, 64], 0, 180, fill=c)
    rect(d, wx - 16, 26, ww + 32, 3, INK)
    rect(d, wx - 16, 29, ww + 32, 2, (255, 255, 255, 120))
    for wxx in (wx + 30, wx + ww - 64):
        d.ellipse([wxx - 1, 147, wxx + 35, 183], fill=INK)
        d.ellipse([wxx + 2, 150, wxx + 32, 180], fill=rgb('#c89860'))
        d.ellipse([wxx + 8, 156, wxx + 26, 174], fill=rgb('#a07040'))
        for a in range(0, 360, 45):
            import math

            rect(d, wxx + 17 + int(12 * math.cos(math.radians(a))), 165 + int(12 * math.sin(math.radians(a))), 2, 2, INK)
        d.ellipse([wxx + 14, 162, wxx + 20, 168], fill=INK)
    # Caixotes e barris nas laterais.
    for bx in (250, 640):
        shadow(img, bx - 4, 176, 48, 10, 90)
        d = ImageDraw.Draw(img)
        box(d, bx, 146, 40, 34, rgb('#b88850'))
        rect(d, bx + 1, 147, 38, 2, rgb('#e0b070'))
        d.line([bx + 2, 148, bx + 37, 177], fill=rgb('#805828'), width=2)
        d.line([bx + 37, 148, bx + 2, 177], fill=rgb('#805828'), width=2)
    if night:
        dark = Image.new('RGBA', (W, H), (10, 14, 40, 0))
        img.alpha_composite(dark)
    return img


def merchant():
    save(road(False), 'road-back')
    save(road(True), 'road-night-back')
    front = Image.new('RGBA', (W, H))
    d = ImageDraw.Draw(front)
    # Balcãozinho de tábuas na frente da carroça.
    box(d, 360, 160, 220, 40, rgb('#8a5a30'))
    rect(d, 361, 161, 218, 3, rgb('#c08850'))
    for xx in range(380, 576, 24):
        rect(d, xx, 164, 1, 36, rgb('#6a4020'))
    save(front, 'road-front')


if __name__ == '__main__':
    mart()
    dept()
    merchant()

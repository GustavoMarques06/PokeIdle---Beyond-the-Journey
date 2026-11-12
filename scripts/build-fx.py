# Monta as folhas de efeitos de golpe e de status (public/sprites/fx/*.png) e o arquivo de dados
# src/game-data/generated/fx-art.json a partir de dois pacotes CC0 guardados em art/fx-packs (impactos, status,
# efeitos das atividades e a energia dos golpes especiais, shot-<tipo>):
#   - PVFX Foundry 1.0.0 (nerijs): https://nerijs.itch.io/pvfx-foundry  (folhas em CC0; toolkit pixelfx, MIT)
#   - Pixel Magic Effects (Foozle): https://foozlecc.itch.io/pixel-magic-sprite-effects  (CC0)
# Cada efeito vira uma tira horizontal de quadros do mesmo tamanho, recortada nas margens vazias e com no máximo
# MAX_FRAMES quadros. O ponto de impacto (ax, ay) é o pivô do efeito dentro do quadro recortado.
# Uso: python scripts/build-fx.py   (requer Pillow)

import json
import re
import zipfile
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
PVFX = zipfile.ZipFile(ROOT / 'art' / 'fx-packs' / 'PVFX-Foundry-1.0.0.zip')
FOOZLE = zipfile.ZipFile(ROOT / 'art' / 'fx-packs' / 'Foozle_Pixel_Magic_Effects.zip')
OUT = ROOT / 'public' / 'sprites' / 'fx'
DATA = ROOT / 'src' / 'game-data' / 'generated' / 'fx-art.json'
MAX_FRAMES = 14
MAX_ONESHOT_MS = 900
FOOZLE_FRAME_MS = 80

# tipo de golpe → efeito. `at`: onde ancora no alvo ('body' = centro do corpo, 'floor' = pés).
# `k`: tamanho de 1 pixel do efeito em pixels virtuais da cena (256 de largura).
IMPACTS = {
    'normal': dict(src='pvfx:impacts/hit-spark', big='pvfx:impacts/crit-hit', at='body', k=0.8),
    'fighting': dict(src='pvfx:impacts/punch-hit', at='body', k=1.5),
    'flying': dict(src='foozle:Wind', at='body', k=0.9),
    'ground': dict(src='pvfx:nature/earth-spike', at='floor', k=0.7),
    'rock': dict(src='pvfx:impacts/rock-shatter', at='floor', k=1.0),
    'ghost': dict(src='pvfx:shadow/shadow-tendrils', at='floor', k=1.0),
    'dark': dict(src='pvfx:melee/shadow-claw', at='body', k=1.2),
    'fire': dict(src='pvfx:fire/fireball-impact', at='body', k=0.9),
    'water': dict(src='foozle:Water_Geyser', at='floor', k=1.0),
    'grass': dict(src='pvfx:nature/leaf-storm', at='body', k=1.4, pivot=False),
    'electric': dict(src='pvfx:lightning/static-burst', big='pvfx:lightning/lightning-strike', big_at='floor', k=0.8, at='body'),
    'psychic': dict(src='pvfx:explosions/arcane-burst', at='body', k=0.9),
    'ice': dict(src='pvfx:ice/frost-nova', at='floor', k=0.9),
    'fairy': dict(src='pvfx:holy/angel-feathers', at='body', k=1.2, pivot=False),
    # Sem efeito próprio no pacote: um parecido, recolorido na cor do tipo (`tint`: sombra, meio-tom e brilho) e com
    # nome próprio (`as`). `once`: o original é em loop, aqui toca uma vez só.
    'poison': dict(src='pvfx:nature/acid-splash', as_='poison-splash', at='floor', k=0.9,
                   tint=((40, 0, 56), (160, 64, 168), (244, 208, 255))),
    'bug': dict(src='pvfx:melee/axe-smear', as_='bug-slash', at='body', k=1.1,
                tint=((24, 40, 0), (152, 184, 24), (248, 255, 208))),
    'steel': dict(src='pvfx:impacts/parry', as_='steel-clang', at='body', k=1.0,
                  tint=((48, 56, 80), (184, 188, 212), (255, 255, 255))),
    'dragon': dict(src='pvfx:fire/fire-tornado', as_='dragon-twister', at='floor', k=0.9, once=True,
                   tint=((24, 8, 72), (112, 56, 248), (208, 232, 255))),
}
# Efeitos que ficam em volta do Pokémon enquanto ele está com o status (em loop).
STATUS = {
    'sleep': dict(src='pvfx:status/sleep', at='head', k=1.0),
    'paralysis': dict(src='pvfx:status/stun-stars', at='head', k=1.2),
    'burn': dict(src='pvfx:status/burning-aura', at='floor', k=1.0),
    'freeze': dict(src='pvfx:status/frozen-chill', at='floor', k=1.4),
    'poison': dict(src='pvfx:status/poisoned', at='floor', k=1.3),
}


def load(spec):
    """Devolve (quadros RGBA, duração total em ms, pivô ou None, é loop)."""
    pack, name = spec.split(':', 1)
    if pack == 'pvfx':
        base = f'effects/{name}/lit/grid/'
        man = json.loads(PVFX.read(base + 'manifest.json'))
        sheet = Image.open(__import__('io').BytesIO(PVFX.read(base + 'sprite-sheet.png'))).convert('RGBA')
        frames, total = [], 0.0
        for f in man['frames']:
            s = f['sheet']
            frames.append(sheet.crop((s['x'], s['y'], s['x'] + s['width'], s['y'] + s['height'])))
            total += f['duration']['numerator_ms'] / f['duration']['denominator']
        return frames, total, tuple(man['pivot']), man['loop_mode'] != 'none'
    pat = re.compile(r'.*/%s/\d+\.png$' % re.escape(name))
    files = sorted(n for n in FOOZLE.namelist() if pat.match(n))
    frames = [Image.open(__import__('io').BytesIO(FOOZLE.read(n))).convert('RGBA') for n in files]
    return frames, len(frames) * FOOZLE_FRAME_MS, None, False


def recolor(frame, tint):
    """Pinta o quadro com a cor do tipo, mantendo a luz e a sombra do desenho (e a transparência)."""
    dark, mid, light = tint
    rgb = ImageOps.colorize(frame.convert('L'), black=dark, white=light, mid=mid).convert('RGBA')
    rgb.putalpha(frame.getchannel('A'))
    return rgb


def build(name, spec, at, k, loop_wanted=False, use_pivot=True, tint=None, once=False):
    frames, total, pivot, is_loop = load(spec)
    if tint:
        frames = [recolor(f, tint) for f in frames]
    if once:
        is_loop = False
    # Recorta no retângulo que une todos os quadros.
    box = None
    for f in frames:
        b = f.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if b:
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    box = box or (0, 0, *frames[0].size)
    frames = [f.crop(box) for f in frames]
    cw, ch = frames[0].size
    # No máximo MAX_FRAMES quadros, espaçados por igual.
    n = len(frames)
    if n > MAX_FRAMES:
        idx = [round(i * (n - 1) / (MAX_FRAMES - 1)) for i in range(MAX_FRAMES)]
        frames = [frames[i] for i in idx]
    strip = Image.new('RGBA', (cw * len(frames), ch), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, (i * cw, 0))
    OUT.mkdir(parents=True, exist_ok=True)
    strip.save(OUT / f'{name}.png', optimize=True)
    # Ponto de impacto: o pivô do pacote (menos o recorte) ou, sem ele, o centro/pés do desenho.
    if pivot and use_pivot:
        ax, ay = pivot[0] - box[0], pivot[1] - box[1]
    else:
        ax, ay = cw / 2, (ch - 1 if at == 'floor' else ch / 2)
    ms = total if loop_wanted or is_loop else min(total, MAX_ONESHOT_MS)
    return dict(w=cw, h=ch, n=len(frames), ms=round(ms), ax=round(ax, 1), ay=round(ay, 1), at=at, k=k, loop=loop_wanted or is_loop)


sheets = {}
types = {}
for t, d in IMPACTS.items():
    entry = {}
    for role, key in (('src', 'src'), ('big', 'big')):
        if key not in d:
            continue
        name = d.get('as_') if role == 'src' and d.get('as_') else re.sub(r'[^a-z0-9]+', '-', d[key].split(':', 1)[1].lower()).strip('-')
        if name not in sheets:
            at = d.get('big_at', d['at']) if role == 'big' else d['at']
            sheets[name] = build(name, d[key], at, d['k'], use_pivot=d.get('pivot', True), tint=d.get('tint'), once=d.get('once', False))
        entry[role] = name
    types[t] = entry
status = {}
for s, d in STATUS.items():
    name = 'status-' + re.sub(r'[^a-z0-9]+', '-', d['src'].split(':', 1)[1].lower()).strip('-').replace('status-', '')
    sheets[name] = build(name, d['src'], d['at'], d['k'], loop_wanted=True)
    status[s] = name

# Efeitos das atividades (fora da batalha): escudo e carga da raide, fogos, moedas, brilhos, corações, colheita…
# chave → (efeito do PVFX, toca em loop?). Saem como act-<chave>.png.
ACTIVITY = {
    'shield': ('pvfx:holy/shield-bubble', True),
    'shatter': ('pvfx:arcane/shield-shatter', False),
    'charge': ('pvfx:status/power-up-aura', True),
    'portal': ('pvfx:arcane/portal-summon', False),
    'circle': ('pvfx:arcane/magic-circle', True),
    'firework': ('pvfx:explosions/firework-burst', False),
    'coins': ('pvfx:ui/coin-pickup', False),
    'stars': ('pvfx:ui/star-burst-pickup', False),
    'glint': ('pvfx:ui/treasure-glint', True),
    'dust': ('pvfx:smoke/dust-puff', False),
    'resurrect': ('pvfx:holy/resurrect', False),
    'hearts': ('pvfx:status/charm-hearts', True),
    'heart': ('pvfx:ui/heart-pickup', False),
    'bloom': ('pvfx:nature/bloom-heal', False),
    'spore': ('pvfx:nature/spore-burst', False),
    'splash': ('pvfx:water/water-splash', False),
    'levelup': ('pvfx:ui/level-up', False),
}
activity = {}
for key, (spec, loop) in ACTIVITY.items():
    name = f'act-{key}'
    sheets[name] = build(name, spec, 'body', 1, loop_wanted=loop, once=not loop)
    activity[key] = name

# Energia dos golpes especiais: sai do atacante e viaja até o alvo. `stream` = jato contínuo (lança-chamas, sopro,
# raio), em loop; `missile` = projétil que atravessa o quadro: os quadros vão só até ele chegar (o impacto no alvo é
# o de IMPACTS). `tint` recolore na cor do tipo, como acima. Saem como shot-<tipo>.png, com `len` = o quanto o
# desenho percorre (em pixels do efeito): a tela estica o efeito até a distância entre os dois Pokémon.
SHOTS = {
    'fire': ('pvfx:fire/flamethrower', 'stream', None),
    'ice': ('pvfx:ice/frost-breath', 'stream', None),
    'psychic': ('pvfx:arcane/arcane-beam', 'stream', None),
    'dragon': ('pvfx:arcane/arcane-beam', 'stream', ((24, 8, 72), (112, 56, 248), (208, 232, 255))),
    'electric': ('pvfx:lightning/chain-lightning', 'missile', None),
    'ghost': ('pvfx:shadow/shadow-bolt', 'missile', None),
    'dark': ('pvfx:shadow/shadow-bolt', 'missile', ((24, 16, 16), (112, 88, 72), (232, 208, 192))),
    'poison': ('pvfx:projectiles/poison-dart', 'missile', ((40, 0, 56), (160, 64, 168), (244, 208, 255))),
    'grass': ('pvfx:projectiles/poison-dart', 'missile', None),
    'water': ('pvfx:projectiles/magic-missile', 'missile', ((8, 32, 96), (72, 144, 232), (208, 240, 255))),
    'normal': ('pvfx:projectiles/magic-missile', 'missile', ((64, 56, 40), (200, 200, 160), (255, 255, 240))),
    'fairy': ('pvfx:projectiles/magic-missile', 'missile', ((96, 24, 64), (238, 153, 172), (255, 236, 244))),
    'fighting': ('pvfx:arcane/arcane-orb-projectile', 'missile', ((64, 8, 8), (208, 64, 40), (255, 224, 192))),
    'flying': ('pvfx:wind/wind-blade', 'missile', None),
    'bug': ('pvfx:wind/wind-blade', 'missile', ((24, 40, 0), (152, 184, 24), (248, 255, 208))),
    'rock': ('pvfx:nature/boulder-toss', 'missile', None),
    'ground': ('pvfx:nature/boulder-toss', 'missile', ((64, 40, 16), (224, 192, 104), (255, 244, 208))),
    'steel': ('pvfx:projectiles/ice-shard', 'missile', ((48, 56, 80), (184, 188, 212), (255, 255, 255))),
}


def build_shot(name, spec, kind, tint):
    frames, total, _pivot, _loop = load(spec)
    if tint:
        frames = [recolor(f, tint) for f in frames]
    boxes = [f.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox() for f in frames]
    per = total / len(frames)
    if kind == 'missile':
        # O projétil anda para a direita; para no quadro em que a frente chega perto do ponto mais longe.
        right = max(b[2] for b in boxes if b)
        keep = next(i for i, b in enumerate(boxes) if b and b[2] >= right * 0.9)
        # Começa no primeiro quadro com desenho.
        first = next(i for i, b in enumerate(boxes) if b)
        frames, boxes = frames[first : keep + 1], boxes[first : keep + 1]
    union = None
    for b in boxes:
        if b:
            union = b if union is None else (min(union[0], b[0]), min(union[1], b[1]), max(union[2], b[2]), max(union[3], b[3]))
    frames = [f.crop(union) for f in frames]
    cw, ch = frames[0].size
    n = len(frames)
    if n > MAX_FRAMES:
        idx = [round(i * (n - 1) / (MAX_FRAMES - 1)) for i in range(MAX_FRAMES)]
        frames = [frames[i] for i in idx]
    strip = Image.new('RGBA', (cw * len(frames), ch), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, (i * cw, 0))
    strip.save(OUT / f'{name}.png', optimize=True)
    ms = per * n if kind == 'missile' else total
    return dict(w=cw, h=ch, n=len(frames), ms=round(ms), ax=0, ay=round(ch / 2, 1), at='body', k=1,
                loop=kind == 'stream', len=cw)


shots = {}
for t, (spec, kind, tint) in SHOTS.items():
    name = f'shot-{t}'
    sheets[name] = build_shot(name, spec, kind, tint)
    shots[t] = name

DATA.write_text(
    json.dumps(dict(types=types, status=status, activity=activity, shots=shots, sheets=sheets), separators=(',', ':')),
    encoding='utf-8',
)
print(len(sheets), 'folhas;', sum(p.stat().st_size for p in OUT.glob('*.png')) // 1024, 'KB')
for n, v in sheets.items():
    print(f"{n:24} {v['w']}x{v['h']} n={v['n']} {v['ms']}ms anchor=({v['ax']},{v['ay']}) {v['at']}")
